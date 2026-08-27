import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class OrganizerReplyDto {
  text!: string;
  repliedByUserId!: string;
  createdAt!: number;
  updatedAt?: number;
}

export class ReviewDto {
  id?: string;
  eventId!: string;
  authorUserId!: string;
  organizerId!: string;
  rating!: number;
  comment?: string;
  createdAt!: number;
  updatedAt?: number;
  organizerReply?: OrganizerReplyDto;
}

/** For the event's own reviews list - who wrote each one (and who replied,
 * if anyone), so a tap can jump to that person's profile. Not an
 * `extends ReviewDto` - organizerReply's shape genuinely differs (gains
 * repliedByName), same sibling-DTO reasoning as GalleryPhotoWithPosterDto vs
 * GalleryPhotoDto. */
export class ReviewWithAuthorDto {
  id!: string;
  eventId!: string;
  authorUserId!: string;
  authorName!: string;
  authorPhotoUrl?: string;
  organizerId!: string;
  rating!: number;
  comment?: string;
  createdAt!: number;
  updatedAt?: number;
  organizerReply?: OrganizerReplyDto & { repliedByName: string };
}

export class CreateReviewDto {
  @IsNumber({}, { message: msg('isNumber') })
  @Min(1, { message: msg('min') })
  @Max(5, { message: msg('max') })
  rating!: number;

  @IsOptional()
  @IsString({ message: msg('isString') })
  @MaxLength(500, { message: msg('maxLength') })
  comment?: string;
}

export class CreateOrganizerReplyDto {
  @IsString({ message: msg('isString') })
  @MaxLength(500, { message: msg('maxLength') })
  text!: string;
}

/** Aggregate rating for a user across every event they've organized -
 * derived on read (ReviewRepository.getOrganizerRating), never persisted. */
export class OrganizerRatingDto {
  organizerId!: string;
  averageRating!: number;
  count!: number;
}
