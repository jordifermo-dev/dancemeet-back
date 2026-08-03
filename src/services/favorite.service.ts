import { EventRepository, FavoriteRepository, UserRepository } from '../repositories';
import { CreateFavoriteDto, EventAttendeeDto, FavoriteDto, FavoritedEventDto, UpdateFavoriteDto } from '../dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../common';
import { NotificationService } from './notification.service';

export class FavoriteService {
  constructor(
    private readonly favoriteRepository: FavoriteRepository,
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new favorite
   */
  async createFavorite(favoriteData: CreateFavoriteDto): Promise<FavoriteDto> {
    try {
      return await this.favoriteRepository.create(favoriteData);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get favorite by ID
   */
  async getFavoriteById(favoriteId: string): Promise<FavoriteDto> {
    try {
      const favorite = await this.favoriteRepository.findById(favoriteId);
      if (!favorite) {
        throw new ResourceNotFoundException('Favorite', favoriteId);
      }
      return favorite;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all favorites
   */
  async getAllFavorites(): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteRepository.findAll();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update favorite
   */
  async updateFavorite(favoriteId: string, updateData: UpdateFavoriteDto): Promise<boolean> {
    try {
      const updated = await this.favoriteRepository.update(favoriteId, updateData);
      if (!updated) {
        throw new ResourceNotFoundException('Favorite', favoriteId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Delete favorite
   */
  async deleteFavorite(favoriteId: string): Promise<boolean> {
    try {
      const deleted = await this.favoriteRepository.delete(favoriteId);
      if (!deleted) {
        throw new ResourceNotFoundException('Favorite', favoriteId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all favorites by user
   */
  async getFavoritesByUser(userId: string): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteRepository.findByUser(userId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get the events a user organizes (creatorId) and/or has favorited,
   * hydrated with the creator's name so the Favorites list can render a full
   * card without a request per event. Each event is tagged with how the user
   * relates to it - creating it always wins over favoriting it (organizing
   * your own event already means you're attending, so there's nothing extra
   * to signal by also marking it favorited).
   */
  async getFavoritedEventsDetailed(userId: string): Promise<FavoritedEventDto[]> {
    try {
      const favorites = await this.favoriteRepository.findByUser(userId);
      const favoritedEventIds = new Set(favorites.map((f) => f.eventId));

      const createdEvents = await this.eventRepository.findByCreator(userId);
      const createdEventIds = new Set(createdEvents.map((e) => e.id!));

      const allEventIds = [...new Set([...favoritedEventIds, ...createdEventIds])];
      if (!allEventIds.length) {
        return [];
      }

      const events = await this.eventRepository.findByIds(allEventIds);
      const creators = await this.userRepository.findByIds([...new Set(events.map((e) => e.creatorId))]);
      const creatorNameById = new Map(creators.map((creator) => [creator.id, creator.name]));

      return events
        .map((event) => {
          const isCreator = createdEventIds.has(event.id!);
          const relation: 'creator' | 'favorite' = isCreator ? 'creator' : 'favorite';
          return {
            ...event,
            creatorName: creatorNameById.get(event.creatorId) ?? '',
            relation,
          };
        })
        .sort((a, b) => b.eventDateFrom - a.eventDateFrom);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all favorites for an event
   */
  async getFavoritesByEvent(eventId: string): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteRepository.findByEvent(eventId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get everyone attending an event (i.e. who has favorited it), hydrated
   * with just enough profile info to render an attendee list - same
   * hydration pattern as UserService.getFollowersDetailed/getFollowingDetailed.
   */
  async getEventAttendeesDetailed(eventId: string): Promise<EventAttendeeDto[]> {
    try {
      const favorites = await this.favoriteRepository.findByEvent(eventId);
      const users = await this.userRepository.findByIds(favorites.map((f) => f.userId));
      const userById = new Map(users.map((user) => [user.id, user]));

      return favorites
        .map((favorite): EventAttendeeDto | null => {
          const user = userById.get(favorite.userId);
          if (!user) {
            return null;
          }
          return {
            id: user.id!,
            name: user.name,
            photoUrl: user.photoUrl,
            disciplineIds: user.disciplineIds,
            attendedAt: favorite.createdAt,
          };
        })
        .filter((item): item is EventAttendeeDto => item !== null);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Check if user has favorited an event
   */
  async isFavorited(userId: string, eventId: string): Promise<boolean> {
    try {
      const favorite = await this.favoriteRepository.findByUserAndEvent(userId, eventId);
      return favorite !== null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Add event to favorites
   */
  async addToFavorites(userId: string, eventId: string): Promise<FavoriteDto> {
    try {
      const existing = await this.favoriteRepository.findByUserAndEvent(userId, eventId);
      if (existing) {
        throw new BusinessRuleException(
          `Event "${eventId}" is already in user "${userId}" favorites`,
          'errors.BUSINESS_ALREADY_FAVORITED',
          { userId, eventId },
        );
      }
      try {
        const created = await this.createFavorite({
          userId,
          eventId,
          createdAt: Date.now(),
        });
        const event = await this.eventRepository.findById(eventId);
        const attendee = await this.userRepository.findById(userId);
        if (event && attendee && event.creatorId !== userId) {
          await this.notificationService.notify(event.creatorId, 'event_attendee', {
            eventId,
            fromUserId: userId,
            name: attendee.name,
            eventTitle: event.title,
          });
        }
        return created;
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Remove event from favorites
   */
  async removeFromFavorites(userId: string, eventId: string): Promise<boolean> {
    try {
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count favorites by user
   */
  async countUserFavorites(userId: string): Promise<number> {
    try {
      return await this.favoriteRepository.count({ userId });
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count favorites by event
   */
  async countEventFavorites(eventId: string): Promise<number> {
    try {
      return await this.favoriteRepository.count({ eventId });
    } catch (err) {
      throw err;
    }
  }
}
