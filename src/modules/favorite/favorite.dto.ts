import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { EventDto } from '../event/event.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class FavoriteDto {
  id?: string;
  userId!: string;
  eventId!: string;
  createdAt!: number;
}

/** An event a user has liked/hearted, hydrated with just enough creator info
 * to render the Favorites list (avatar/name) without a second round-trip per
 * card. A Favorite is a plain "me gusta" with no further implications - it
 * does not mean the user is attending (see AttendanceDto/AttendedEventDto in
 * src/modules/attendance/, the real RSVP that drives the attendee list,
 * count, gallery permission and organizer notification). */
export class FavoritedEventDto extends EventDto {
  creatorName!: string;
  relation!: 'creator' | 'favorite';
  attendeesCount!: number;
  likesCount!: number;
  reviewsCount!: number;
  averageRating!: number;
  /** Whether the *viewer* (not the card's own creatorId/relation) genuinely
   * attends this event - a plain 'favorite' relation does NOT imply this
   * (liking an event you don't attend is normal), unlike 'creator', which
   * always does. Drives the attendee-count icon's active/grey state on the
   * card (event-card.component.ts), same idea as isLiked. */
  isAttending!: boolean;
  /** Unread-message/new-photo card badges - undefined (not 0) for an event
   * this user doesn't genuinely attend (see FavoriteService.
   * getFavoritedEventsDetailed/EventChatService.getUnreadCountsByEvents) -
   * the frontend only ever renders a badge when the field is present. */
  unreadChatCount?: number;
  unreadGalleryCount?: number;
  unreadPrivateGalleryCount?: number;
}

export class CreateFavoriteDto {
  @IsMongoId({ message: msg('isMongoId') })
  userId!: string;

  @IsMongoId({ message: msg('isMongoId') })
  eventId!: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}

