import { ModuleRef } from '@nestjs/core';
import { FavoriteRepository } from './favorite.repository';
import { CreateFavoriteDto, FavoriteDto, FavoritedEventDto } from './favorite.dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../../common';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { EventManagerService } from '../event-manager/event-manager.service';

/** A Favorite is a plain "me gusta" a user puts on an event - marks the
 * heart filled and lists the event under Favoritos, nothing more. It does
 * NOT mean the user is attending; see AttendanceService (src/modules/
 * attendance/) for the real RSVP that drives the attendee list, count,
 * gallery-posting permission and the organizer's "new attendee" notification. */
export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly moduleRef: ModuleRef,
    private readonly userService: UserService,
  ) {}

  /**
   * See UserService.followersService for why this is resolved lazily via
   * ModuleRef instead of constructor-injected.
   */
  private get eventService(): EventService {
    return this.moduleRef.get(EventService, { strict: false });
  }

  /** Same reasoning as eventService above - circular with EventManagerModule
   * (EventManagerService.respondToInvite calls ensureFavoritedMany below). */
  private get eventManagerService(): EventManagerService {
    return this.moduleRef.get(EventManagerService, { strict: false });
  }

  /**
   * Create a new favorite
   */
  async createFavorite(favoriteData: CreateFavoriteDto): Promise<FavoriteDto> {
    return await this.favoriteRepository.create(favoriteData);
  }

  /**
   * Get the events a user organizes (creatorId) and/or has liked, hydrated
   * with the creator's name so the Favorites list can render a full card
   * without a request per event. Each event is tagged with how the user
   * relates to it - creating it always wins over liking it (organizing your
   * own event already means you're attending, so there's nothing extra to
   * signal by also marking it liked).
   */
  async getFavoritedEventsDetailed(userId: string): Promise<FavoritedEventDto[]> {
    const favorites = await this.favoriteRepository.findByUser(userId);
    const favoritedEventIds = new Set(favorites.map((f) => f.eventId));

    const createdEvents = await this.eventService.findByCreator(userId);
    const createdEventIds = new Set(createdEvents.map((e) => e.id!));
    // An accepted manager has the same organizer-level relationship to the
    // event as its creator (see EventManagerService.respondToInvite, which
    // already auto-likes them on accept the same way createEvent() does for
    // the creator) - treated identically here so "Organizas" shows for both,
    // not just the literal creatorId match.
    const managedEventIds = new Set(await this.eventManagerService.getAcceptedEventIdsForUser(userId));

    const allEventIds = [...new Set([...favoritedEventIds, ...createdEventIds])];
    if (!allEventIds.length) {
      return [];
    }

    const events = await this.eventService.findByIds(allEventIds);
    const creators = await this.userService.findByIds([...new Set(events.map((e) => e.creatorId))]);
    const creatorNameById = new Map(creators.map((creator) => [creator.id, creator.name]));

    return events
      .map((event) => {
        const isCreator = createdEventIds.has(event.id!) || managedEventIds.has(event.id!);
        const relation: 'creator' | 'favorite' = isCreator ? 'creator' : 'favorite';
        return {
          ...event,
          creatorName: creatorNameById.get(event.creatorId) ?? '',
          relation,
        };
      })
      .sort((a, b) => b.eventDateFrom - a.eventDateFrom);
  }

  /**
   * Raw passthrough - for other services that need an event's likers without
   * depending on FavoriteRepository directly.
   */
  async findByEvent(eventId: string): Promise<FavoriteDto[]> {
    return await this.favoriteRepository.findByEvent(eventId);
  }

  /**
   * Check if user has favorited (liked) an event
   */
  async isFavorited(userId: string, eventId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findByUserAndEvent(userId, eventId);
    return favorite !== null;
  }

  /**
   * Add event to favorites - a plain like, no notification and no effect on
   * attendance (see AttendanceService.addAttendance for the RSVP that does
   * notify the organizer).
   */
  async addToFavorites(userId: string, eventId: string): Promise<FavoriteDto> {
    const existing = await this.favoriteRepository.findByUserAndEvent(userId, eventId);
    if (existing) {
      throw new BusinessRuleException(
        `Event "${eventId}" is already in user "${userId}" favorites`,
        'errors.BUSINESS_ALREADY_FAVORITED',
        { userId, eventId },
      );
    }
    try {
      return await this.createFavorite({
        userId,
        eventId,
        createdAt: Date.now(),
      });
    } catch (err) {
      if (err instanceof DuplicateKeyException) {
        throw new BusinessRuleException(
          `Event "${eventId}" is already in user "${userId}" favorites`,
          'errors.BUSINESS_ALREADY_FAVORITED',
          { userId, eventId },
        );
      }
      throw err;
    }
  }

  /**
   * Remove event from favorites
   */
  async removeFromFavorites(userId: string, eventId: string): Promise<boolean> {
    const existing = await this.favoriteRepository.findByUserAndEvent(userId, eventId);
    if (!existing) {
      throw new ResourceNotFoundException(
        'Favorite',
        `user "${userId}" / event "${eventId}"`,
        'errors.FAVORITE_NOT_FOUND_BY_USER_EVENT',
        { userId, eventId },
      );
    }
    await this.favoriteRepository.deleteByUserAndEvent(userId, eventId);
    return true;
  }

  /**
   * Favorites every instance of a recurring series at once - the events the
   * user already favorited (e.g. the one they tapped the heart on) are left
   * alone, only the missing instances get a new Favorite row. No
   * notification - liking is a plain "me gusta" with no further implications.
   */
  async addSeriesToFavorites(userId: string, seriesId: string): Promise<void> {
    const events = await this.eventService.getEventsBySeriesId(seriesId);
    if (!events.length) {
      throw new ResourceNotFoundException('Event series', seriesId);
    }
    const existing = await this.favoriteRepository.findByUserAndEvents(
      userId,
      events.map((event) => event.id!),
    );
    const alreadyFavoritedIds = new Set(existing.map((favorite) => favorite.eventId));
    const toCreate = events.filter((event) => !alreadyFavoritedIds.has(event.id!));
    if (!toCreate.length) {
      return;
    }
    await Promise.all(
      toCreate.map((event) =>
        this.favoriteRepository.create({ userId, eventId: event.id!, createdAt: Date.now() }),
      ),
    );
  }

  /**
   * Un-favorites every instance of a recurring series at once.
   */
  async removeSeriesFromFavorites(userId: string, seriesId: string): Promise<void> {
    const events = await this.eventService.getEventsBySeriesId(seriesId);
    if (!events.length) {
      throw new ResourceNotFoundException('Event series', seriesId);
    }
    await this.favoriteRepository.deleteManyByUserAndEvents(
      userId,
      events.map((event) => event.id!),
    );
  }

  /**
   * Count favorites by event
   */
  async countEventFavorites(eventId: string): Promise<number> {
    return await this.favoriteRepository.count({ eventId });
  }

  /**
   * Idempotent bulk-favorite - creates a Favorite row for any of the given
   * events the user doesn't already have one for, skips the rest. The
   * automatic side effect of becoming a confirmed attendee (accepting a
   * manager invite, being the creator) - mirrors EventService.createEvent's
   * own auto-favorite for the creator. Used by EventManagerService.
   * respondToInvite and EventService.createEvent/createEventSeries/
   * attachRecurrenceToEvent.
   */
  async ensureFavoritedMany(userId: string, eventIds: string[]): Promise<void> {
    if (!eventIds.length) {
      return;
    }
    const existing = await this.favoriteRepository.findByUserAndEvents(userId, eventIds);
    const alreadyFavoritedIds = new Set(existing.map((favorite) => favorite.eventId));
    const toCreate = eventIds.filter((eventId) => !alreadyFavoritedIds.has(eventId));
    if (!toCreate.length) {
      return;
    }
    await Promise.all(
      toCreate.map((eventId) => this.favoriteRepository.create({ userId, eventId, createdAt: Date.now() })),
    );
  }
}
