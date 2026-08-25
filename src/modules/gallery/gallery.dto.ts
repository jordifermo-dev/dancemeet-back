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
}

/** For the event's own gallery - who posted each photo, so a tap can jump
 * to that person's profile (see GalleryController.getEventGallery). */
export class GalleryPhotoWithPosterDto extends GalleryPhotoDto {
  posterUserName!: string;
  posterUserPhotoUrl?: string;
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
