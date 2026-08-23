import { GalleryRepository } from './gallery.repository';
import { GalleryCoverDto, GalleryPhotoDto, GalleryPhotoWithEventDto, GalleryPhotoWithPosterDto } from './gallery.dto';
import { ForbiddenActionException, ResourceNotFoundException } from '../../common';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { FavoriteService } from '../favorite/favorite.service';
import { NotificationService } from '../notification/notification.service';

export class GalleryService {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly userService: UserService,
    private readonly eventService: EventService,
    private readonly favoriteService: FavoriteService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Authorization lives entirely in EventService.assertCanPostPhoto (the
   * creator/managers can always post, an accepted attendee can if the
   * organizer left allowAttendeePhotos on) - this method doesn't duplicate
   * any of that. After saving the photo, fans out two kinds of notification:
   * to the poster's own followers, and to the event's other attendees -
   * neither includes the poster themselves, and someone who's both a
   * follower and an attendee may get both notifications (a deliberate v1
   * simplification, not deduped between the two).
   */
  async postPhoto(eventId: string, posterUserId: string, photoUrl: string): Promise<GalleryPhotoDto> {
    const event = await this.eventService.assertCanPostPhoto(eventId, posterUserId);
    const photo = await this.repository.create({ eventId, posterUserId, photoUrl });

    const poster = await this.userService.findById(posterUserId);
    const posterName = poster?.name ?? '';

    const [followers, attendees] = await Promise.all([
      this.userService.getFollowersDetailed(posterUserId),
      this.favoriteService.getEventAttendeesDetailed(eventId),
    ]);
    const followerIds = followers.map((follower) => follower.id).filter((id) => id !== posterUserId);
    const attendeeIds = attendees.map((attendee) => attendee.id).filter((id) => id !== posterUserId);

    await Promise.all([
      this.notificationService.notifyMany(followerIds, 'gallery_photo_followed', {
        name: posterName,
        eventTitle: event.title,
      }),
      this.notificationService.notifyMany(attendeeIds, 'gallery_photo_attending', {
        name: posterName,
        eventTitle: event.title,
      }),
    ]);

    return photo;
  }

  /**
   * A photo posted straight to the poster's own profile, with no event
   * involved - the only authorization question is "is this your own
   * profile", unlike postPhoto's event-permission check. Notifies followers
   * with a separate template (gallery_photo_profile) that doesn't mention an
   * event, since there isn't one; there's no attendee list to fan out to
   * either.
   */
  async postProfilePhoto(userId: string, requestingUserId: string, photoUrl: string): Promise<GalleryPhotoDto> {
    if (userId !== requestingUserId) {
      throw new ForbiddenActionException(
        `User "${requestingUserId}" is not allowed to post photos to profile "${userId}"`,
        'errors.FORBIDDEN_POST_PROFILE_PHOTO',
      );
    }
    const photo = await this.repository.create({ posterUserId: userId, photoUrl });

    const poster = await this.userService.findById(userId);
    const followers = await this.userService.getFollowersDetailed(userId);
    const followerIds = followers.map((follower) => follower.id).filter((id) => id !== userId);
    await this.notificationService.notifyMany(followerIds, 'gallery_photo_profile', {
      name: poster?.name ?? '',
    });

    return photo;
  }

  /** Hydrated for the event's own gallery - who posted each photo, so a tap
   * can jump to that person's profile. */
  async getEventGalleryDetailed(eventId: string): Promise<GalleryPhotoWithPosterDto[]> {
    const photos = await this.repository.findByEvent(eventId);
    if (!photos.length) {
      return [];
    }
    const posters = await this.userService.findByIds([...new Set(photos.map((photo) => photo.posterUserId))]);
    const posterById = new Map(posters.map((poster) => [poster.id, poster]));
    return photos
      .map((photo): GalleryPhotoWithPosterDto | null => {
        const poster = posterById.get(photo.posterUserId);
        if (!poster) {
          return null;
        }
        return { ...photo, posterUserName: poster.name, posterUserPhotoUrl: poster.photoUrl };
      })
      .filter((item): item is GalleryPhotoWithPosterDto => item !== null);
  }

  /** Hydrated for a user's own gallery - which event each photo came from,
   * so a tap can jump to that event. A photo posted straight to the profile
   * has no eventId at all and is kept as-is (eventTitle/eventImageUrl left
   * undefined) rather than dropped - only a photo that names an event that
   * can no longer be found (deleted) is filtered out. */
  async getUserGalleryDetailed(posterUserId: string): Promise<GalleryPhotoWithEventDto[]> {
    const photos = await this.repository.findByUser(posterUserId);
    if (!photos.length) {
      return [];
    }
    const eventIds = [...new Set(photos.map((photo) => photo.eventId).filter((id): id is string => !!id))];
    const events = await this.eventService.findByIds(eventIds);
    const eventById = new Map(events.map((event) => [event.id, event]));
    return photos
      .map((photo): GalleryPhotoWithEventDto | null => {
        if (!photo.eventId) {
          return { ...photo };
        }
        const event = eventById.get(photo.eventId);
        if (!event) {
          return null;
        }
        return { ...photo, eventTitle: event.title, eventImageUrl: event.imageUrl };
      })
      .filter((item): item is GalleryPhotoWithEventDto => item !== null);
  }

  /** Raw passthrough for the "browse events by photo" cover-image mode - see
   * GalleryCoversController. */
  async getCoverPhotosForEvents(eventIds: string[]): Promise<Record<string, GalleryCoverDto>> {
    const coverByEventId = await this.repository.findLatestCoverByEventIds(eventIds);
    return Object.fromEntries(
      [...coverByEventId.entries()].map(([eventId, { photo, count }]) => [eventId, { photoUrl: photo.photoUrl, count }]),
    );
  }

  /** The poster can remove their own photo; otherwise this falls back to
   * EventService.assertCanManage so an organizer can moderate their event's
   * gallery. This lives here (not on EventService) because "do I own this
   * specific photo" is gallery-domain logic, not an event-authorization
   * question. */
  async deletePhoto(eventId: string, photoId: string, requestingUserId: string): Promise<void> {
    const photo = await this.repository.findById(photoId);
    if (!photo || photo.eventId !== eventId) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    if (photo.posterUserId !== requestingUserId) {
      await this.eventService.assertCanManage(eventId, requestingUserId);
    }
    await this.repository.deleteById(photoId);
  }

  /** Counterpart of deletePhoto for a photo posted straight to a profile -
   * no event to moderate through, so only the poster themselves can remove it. */
  async deleteProfilePhoto(userId: string, photoId: string, requestingUserId: string): Promise<void> {
    const photo = await this.repository.findById(photoId);
    if (!photo || photo.eventId || photo.posterUserId !== userId) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    if (photo.posterUserId !== requestingUserId) {
      throw new ForbiddenActionException(
        `User "${requestingUserId}" is not allowed to delete photo "${photoId}"`,
        'errors.FORBIDDEN_POST_PROFILE_PHOTO',
      );
    }
    await this.repository.deleteById(photoId);
  }
}
