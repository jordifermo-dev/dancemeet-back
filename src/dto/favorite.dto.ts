import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { EventDto } from './event.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class FavoriteDto {
  id?: string;
  userId!: string;
  eventId!: string;
  createdAt!: number;
}

/** An event a user has favorited, hydrated with just enough creator info to
 * render the Favorites list (avatar/name) without a second round-trip per card. */
export class FavoritedEventDto extends EventDto {
  creatorName!: string;
  relation!: 'creator' | 'favorite';
}

/** One row of an event's attendee list - same shape as FollowUserDto (one row
 * of a followers/following list), just "since" the user favorited/marked
 * themselves attending this event instead of since they followed someone. */
export class EventAttendeeDto {
  id!: string;
  name!: string;
  photoUrl?: string;
  disciplineIds!: string[];
  attendedAt!: number;
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

export class UpdateFavoriteDto {
  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  userId?: string;

  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  eventId?: string;

  @IsOptional()
  @IsNumber({}, { message: msg('isNumber') })
  createdAt?: number;
}
