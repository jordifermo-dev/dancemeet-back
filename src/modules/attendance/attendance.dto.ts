import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { EventDto } from '../event/event.dto';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export class AttendanceDto {
  id?: string;
  userId!: string;
  eventId!: string;
  createdAt!: number;
}

/** An event a user is genuinely attending, hydrated with just enough
 * creator info to render the "Mis eventos" list (avatar/name) without a
 * second round-trip per card. */
export class AttendedEventDto extends EventDto {
  creatorName!: string;
  relation!: 'creator' | 'attendee';
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
  createdAt?: number;
}
