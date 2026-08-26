import { GalleryRepository } from './gallery.repository';
import {
  GalleryCoverDto,
  GalleryPhotoDto,
  GalleryPhotoWithEventDto,
  GalleryPhotoWithPosterDto,
  GroupedReactionDto,
} from './gallery.dto';
import { ForbiddenActionException, ResourceNotFoundException } from '../../common';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationService } from '../notification/notification.service';

export class GalleryService {
  constructor(
    private readonly repository: GalleryRepository,
    private readonly userService: UserService,
    private readonly eventService: EventService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Authorization lives entirely in EventService.assertCanPostPhoto (the
   * creator/managers can always post, an accepted attendee can if the
   * organizer left allowAttendeePhotos on) - this method doesn't duplicate
   * any of that. After saving the photo, fans out two kinds of notification:
   * to the poster's own followers, and to the event's other attendees -
   * neither includes the poster themselves. Someone who's both a follower
   * and an attendee only gets the attendee notification (gallery_photo_
   * attending), not both - that template is the one that names the public/
   * private gallery explicitly, so it's the more informative of the two for
   * whoever qualifies either way.
   */
  async postPhoto(eventId: string, posterUserId: string, photoUrl: string): Promise<GalleryPhotoDto> {
    const event = await this.eventService.assertCanPostPhoto(eventId, posterUserId);
    const photo = await this.repository.create({
      eventId,
      posterUserId,
      photoUrl,
      showInPublicGallery: true,
      showInPrivateGallery: false,
    });

    const poster = await this.userService.findById(posterUserId);
    const posterName = poster?.name ?? '';

    const [followers, attendees] = await Promise.all([
      this.userService.getFollowersDetailed(posterUserId),
      this.attendanceService.getEventAttendeesDetailed(eventId),
    ]);
    const attendeeIds = attendees.map((attendee) => attendee.id).filter((id) => id !== posterUserId);
    const attendeeIdSet = new Set(attendeeIds);
    const followerOnlyIds = followers
      .map((follower) => follower.id)
      .filter((id) => id !== posterUserId && !attendeeIdSet.has(id));

    await Promise.all([
      this.notificationService.notifyMany(followerOnlyIds, 'gallery_photo_followed', {
        name: posterName,
        eventTitle: event.title,
        eventId,
      }),
      this.notificationService.notifyMany(attendeeIds, 'gallery_photo_attending', {
        name: posterName,
        eventTitle: event.title,
        eventId,
        gallery: 'public',
      }),
    ]);

    return photo;
  }

  /**
   * Posts to the event's private, attendees-only gallery - gated by
   * assertCanAccessPrivateArea (not assertCanPostPhoto, which depends on
   * allowAttendeePhotos - a toggle specific to the public gallery). Notifies
   * only the event's real attendees (the only audience who can ever see this
   * photo), unlike postPhoto which also notifies followers.
   */
  async postPrivatePhoto(eventId: string, posterUserId: string, photoUrl: string): Promise<GalleryPhotoDto> {
    const event = await this.eventService.assertCanAccessPrivateArea(eventId, posterUserId);
    const photo = await this.repository.create({
      eventId,
      posterUserId,
      photoUrl,
      showInPublicGallery: false,
      showInPrivateGallery: true,
    });

    const poster = await this.userService.findById(posterUserId);
    const attendees = await this.attendanceService.getEventAttendeesDetailed(eventId);
    const attendeeIds = attendees.map((attendee) => attendee.id).filter((id) => id !== posterUserId);
    await this.notificationService.notifyMany(attendeeIds, 'gallery_photo_attending', {
      name: poster?.name ?? '',
      eventTitle: event.title,
      eventId,
      gallery: 'private',
    });

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
      fromUserId: userId,
    });

    return photo;
  }

  /** Hydrated for the event's own PUBLIC gallery - who posted each photo, so
   * a tap can jump to that person's profile, plus this viewer's reaction
   * summary per photo. Anyone can see this, so only photos flagged
   * showInPublicGallery come back (see getPrivateEventGalleryDetailed for
   * the attendees-only counterpart). requestingUserId is only needed to
   * resolve reactedByMe - it does not gate this method at all (matches the
   * public gallery's existing wide-open read access). */
  async getEventGalleryDetailed(eventId: string, requestingUserId: string): Promise<GalleryPhotoWithPosterDto[]> {
    const photos = await this.repository.findPublicByEvent(eventId);
    return this.hydratePosters(photos, requestingUserId);
  }

  /** Hydrated for the event's PRIVATE, attendees-only gallery - same shape
   * as getEventGalleryDetailed, gated by assertCanAccessPrivateArea first. */
  async getPrivateEventGalleryDetailed(eventId: string, requestingUserId: string): Promise<GalleryPhotoWithPosterDto[]> {
    await this.eventService.assertCanAccessPrivateArea(eventId, requestingUserId);
    const photos = await this.repository.findPrivateByEvent(eventId);
    return this.hydratePosters(photos, requestingUserId);
  }

  /** Looks up one photo by id for cross-navigation from a xat mention (see
   * EventMessageWithSenderDto.attachedPhoto) - a private-only photo still
   * requires assertCanAccessPrivateArea, a publicly-visible one (in any
   * degree) doesn't, same rule reactToPhoto below uses. */
  async getPhotoDetailed(eventId: string, photoId: string, requestingUserId: string): Promise<GalleryPhotoWithPosterDto> {
    const photo = await this.repository.findById(photoId);
    if (!photo || photo.eventId !== eventId) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    if (!photo.showInPublicGallery) {
      await this.eventService.assertCanAccessPrivateArea(eventId, requestingUserId);
    }
    const [hydrated] = await this.hydratePosters([photo], requestingUserId);
    if (!hydrated) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    return hydrated;
  }

  async reactToPhoto(eventId: string, photoId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    const photo = await this.assertCanReact(eventId, photoId, userId);
    const updated = await this.repository.addReaction(photo.id!, emoji, userId);
    return this.groupReactions(updated!.reactions, userId);
  }

  async removeReactionFromPhoto(eventId: string, photoId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    const photo = await this.assertCanReact(eventId, photoId, userId);
    const updated = await this.repository.removeReaction(photo.id!, emoji, userId);
    return this.groupReactions(updated!.reactions, userId);
  }

  /** A private-only photo requires assertCanAccessPrivateArea; a photo
   * visible publicly (in any degree, even if also private) is open to any
   * requesting user, matching the public gallery's own existing read
   * access - reacting isn't more sensitive than reading. */
  private async assertCanReact(eventId: string, photoId: string, requestingUserId: string): Promise<GalleryPhotoDto> {
    const photo = await this.repository.findById(photoId);
    if (!photo || photo.eventId !== eventId) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    if (!photo.showInPublicGallery) {
      await this.eventService.assertCanAccessPrivateArea(eventId, requestingUserId);
    }
    return photo;
  }

  private groupReactions(reactions: { emoji: string; userId: string }[], requestingUserId: string): GroupedReactionDto[] {
    const byEmoji = new Map<string, string[]>();
    for (const reaction of reactions) {
      const userIds = byEmoji.get(reaction.emoji) ?? [];
      userIds.push(reaction.userId);
      byEmoji.set(reaction.emoji, userIds);
    }
    return [...byEmoji.entries()].map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      reactedByMe: userIds.includes(requestingUserId),
    }));
  }

  private async hydratePosters(photos: GalleryPhotoDto[], requestingUserId: string): Promise<GalleryPhotoWithPosterDto[]> {
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
        return {
          id: photo.id!,
          eventId: photo.eventId,
          posterUserId: photo.posterUserId,
          photoUrl: photo.photoUrl,
          showInPublicGallery: photo.showInPublicGallery,
          showInPrivateGallery: photo.showInPrivateGallery,
          createdAt: photo.createdAt,
          posterUserName: poster.name,
          posterUserPhotoUrl: poster.photoUrl,
          reactions: this.groupReactions(photo.reactions, requestingUserId),
        };
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

  /**
   * Makes a private (or private+public) photo also show in the event's
   * public gallery - e.g. sharing something from the group's private
   * gallery more broadly. Only the poster or a manager can do this (same
   * ownership check as deletePhoto). Leaves showInPrivateGallery untouched -
   * this is additive, not a move (see moveToPrivateGallery for the reverse).
   */
  async shareToPublicGallery(eventId: string, photoId: string, requestingUserId: string): Promise<void> {
    const photo = await this.assertOwnsOrCanManage(eventId, photoId, requestingUserId);
    if (photo.showInPublicGallery) {
      return;
    }
    await this.repository.updateVisibility(photoId, { showInPublicGallery: true });
  }

  /**
   * Moves a public photo (shared by mistake) to the private gallery only -
   * unlike shareToPublicGallery, this is a move: showInPublicGallery is
   * cleared, so the photo also disappears from the poster's own public
   * profile gallery (see GalleryRepository.findByUser). Requires
   * assertCanAccessPrivateArea too - whoever moves something into the
   * private area must actually be allowed in it.
   */
  async moveToPrivateGallery(eventId: string, photoId: string, requestingUserId: string): Promise<void> {
    const photo = await this.assertOwnsOrCanManage(eventId, photoId, requestingUserId);
    await this.eventService.assertCanAccessPrivateArea(eventId, requestingUserId);
    if (photo.showInPrivateGallery && !photo.showInPublicGallery) {
      return;
    }
    await this.repository.updateVisibility(photoId, { showInPrivateGallery: true, showInPublicGallery: false });
  }

  /** Shared ownership check behind shareToPublicGallery/moveToPrivateGallery
   * - same rule as deletePhoto (poster themselves, or a manager). */
  private async assertOwnsOrCanManage(eventId: string, photoId: string, requestingUserId: string): Promise<GalleryPhotoDto> {
    const photo = await this.repository.findById(photoId);
    if (!photo || photo.eventId !== eventId) {
      throw new ResourceNotFoundException('GalleryPhoto', photoId);
    }
    if (photo.posterUserId !== requestingUserId) {
      await this.eventService.assertCanManage(eventId, requestingUserId);
    }
    return photo;
  }

  /** The poster can remove their own photo; otherwise this falls back to
   * EventService.assertCanManage so an organizer can moderate their event's
   * gallery. This lives here (not on EventService) because "do I own this
   * specific photo" is gallery-domain logic, not an event-authorization
   * question. */
  async deletePhoto(eventId: string, photoId: string, requestingUserId: string): Promise<void> {
    await this.assertOwnsOrCanManage(eventId, photoId, requestingUserId);
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
