import { IsBoolean, IsIn, IsMongoId } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import type { EventManagerRole, EventManagerStatus } from './event-manager.schema';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

export const EVENT_MANAGER_ROLES: EventManagerRole[] = ['attendee', 'manager'];

export class EventManagerDto {
  id?: string;
  eventId!: string;
  userId!: string;
  invitedByUserId!: string;
  role!: EventManagerRole;
  status!: EventManagerStatus;
  createdAt!: number;
  respondedAt?: number;
}

/** One row of the "Asistentes" screen's participant list - same hydration
 * idea as EventAttendeeDto/FollowUserDto, plus the role/status this
 * particular relationship carries. */
export class EventManagerDetailedDto {
  id!: string;
  eventId!: string;
  userId!: string;
  userName!: string;
  userPhotoUrl?: string;
  userEmail!: string;
  /** Whether the user opted to make their email publicly visible - same
   * client-side-gated display pattern as UserDto.showEmail elsewhere in the
   * app (see user-detail.page.ts), not filtered out server-side. */
  userShowEmail!: boolean;
  userDisciplineIds!: string[];
  role!: EventManagerRole;
  status!: EventManagerStatus;
  createdAt!: number;
}

export class InviteManagerDto {
  @IsMongoId({ message: msg('isMongoId') })
  userId!: string;

  @IsIn(EVENT_MANAGER_ROLES, { message: msg('isIn') })
  role!: EventManagerRole;
}

export class RespondToInviteDto {
  @IsBoolean({ message: msg('isBoolean') })
  accept!: boolean;
}
