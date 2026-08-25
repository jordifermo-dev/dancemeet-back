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

