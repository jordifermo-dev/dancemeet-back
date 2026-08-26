import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class GalleryPhotoDto {
  id?: string;
  /** Absent for a photo posted directly to a profile, with no event involved. */
  eventId?: string;
  posterUserId!: string;
  photoUrl!: string;
  /** Only meaningful when eventId is set - see GalleryPhotoDocument's own
   * doc comment for why these are independent, not one boolean. */
  showInPublicGallery!: boolean;
  showInPrivateGallery!: boolean;
  createdAt!: number;
  /** Raw, ungrouped {emoji,userId} list - same shape/reasoning as
   * EventMessageDto.reactions in event-chat.dto.ts. Grouping/reactedByMe
   * happens in GalleryPhotoWithPosterDto's own reactions field instead. */
  reactions!: { emoji: string; userId: string }[];
}

/** One emoji's reaction summary on a photo, from one specific viewer's point
 * of view - grouped/counted in GalleryService, never stored this way. Small
 * duplicate of event-chat's own GroupedReactionDto rather than a cross-
 * domain import, matching this backend's existing low-coupling convention. */
export class GroupedReactionDto {
  emoji!: string;
  count!: number;
  reactedByMe!: boolean;
}

/** For the event's own gallery - who posted each photo, so a tap can jump
 * to that person's profile (see GalleryController.getEventGallery). Not an
 * `extends GalleryPhotoDto` - its `reactions` shape is intentionally
 * different (grouped, not the flat stored list), so it's a plain sibling
 * DTO instead of an incompatible override (same reasoning as
 * EventMessageWithSenderDto vs EventMessageDto in event-chat.dto.ts). */
export class GalleryPhotoWithPosterDto {
  id!: string;
  eventId?: string;
  posterUserId!: string;
  photoUrl!: string;
  showInPublicGallery!: boolean;
  showInPrivateGallery!: boolean;
  createdAt!: number;
  posterUserName!: string;
  posterUserPhotoUrl?: string;
  reactions!: GroupedReactionDto[];
}

/** For a user's own gallery - which event each photo came from, so a tap
 * can jump to that event (see UserGalleryController.getUserGallery). Both
 * absent for a photo posted straight to the profile, with no event. */
export class GalleryPhotoWithEventDto extends GalleryPhotoDto {
  eventTitle?: string;
  eventImageUrl?: string;
}

/** One event's entry in the "browse events by photo" cover-image mode (see
 * GalleryCoversController) - count lets that mode hint "several photos"
 * without a second request per event. */
export class GalleryCoverDto {
  photoUrl!: string;
  count!: number;
}

export class CreateGalleryPhotoDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  photoUrl!: string;
}

export class ReactToPhotoDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  emoji!: string;
}
