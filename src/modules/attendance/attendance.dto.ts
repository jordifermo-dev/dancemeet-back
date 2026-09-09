import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { EventDto } from '../event/event.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class AttendanceDto {
  id?: string;
  userId!: string;
  eventId!: string;
  /** See AttendanceDocument's own doc comment - absent means "use createdAt
   * as the chat history cutoff", 0 means full history. */
  chatVisibleFrom?: number;
  /** See AttendanceDocument's own doc comment - absent means never read. */
  lastReadChatAt?: number;
  lastReadGalleryAt?: number;
  lastReadPrivateGalleryAt?: number;
  createdAt!: number;
}

/** An event a user is genuinely attending, hydrated with just enough
 * creator info to render the "Mis eventos" list (avatar/name) without a
 * second round-trip per card. Also the source of the Chats tab's "events
 * with private-chat access" rows - unlike FavoritedEventDto (favorited ∪
 * created), this union (attended ∪ created) matches EventService.
 * assertCanAccessPrivateArea exactly, so every event returned here genuinely
 * has a private xat the viewer can open. */
export class AttendedEventDto extends EventDto {
  creatorName!: string;
  relation!: 'creator' | 'attendee';
  attendeesCount!: number;
  likesCount!: number;
  reviewsCount!: number;
  averageRating!: number;
  /** Always true - every event in this list is, by definition, one the
   * viewer genuinely attends (see this DTO's own doc comment). */
  isAttending!: boolean;
  /** Unread-message/new-photo card badges - same shape as FavoritedEventDto's
   * own (see its doc comment): always present here, since every event in
   * this list already has genuine attendance. */
  unreadChatCount?: number;
  unreadGalleryCount?: number;
  unreadPrivateGalleryCount?: number;
  /** Timestamp of the most recent (non-deleted) message in this event's
   * private xat, or undefined if it has none yet - drives the Chats tab's
   * recency ordering (see AttendanceService.getAttendedEventsDetailed). Not
   * used anywhere else (Mis Events ignores it). */
  lastChatActivityAt?: number;
}

/** One row of an event's real attendee list - same shape as FollowUserDto
 * (one row of a followers/following list), just "since" the user marked
 * themselves attending this event instead of since they followed someone.
 * Moved here from favorite.dto.ts - a Favorite (like) no longer implies
 * attendance. */
export class EventAttendeeDto {
  id!: string;
  name!: string;
  photoUrl?: string;
  disciplineIds!: string[];
  attendedAt!: number;
}

export class CreateAttendanceDto {
  @IsMongoId({ message: msg('isMongoId') })
  userId!: string;

  @IsMongoId({ message: msg('isMongoId') })
  eventId!: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  chatVisibleFrom?: number;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}
