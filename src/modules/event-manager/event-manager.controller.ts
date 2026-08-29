import { Body, Controller, Delete, Get, Param, Patch, Post, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { EventManagerService } from './event-manager.service';
import { EventManagerDetailedDto, InviteManagerDto, RespondToInviteDto } from './event-manager.dto';

@Controller('api/events/:eventId/managers')
@UseInterceptors(CurrentUserInterceptor)
export class EventManagerController {
  constructor(private readonly eventManagerService: EventManagerService) {}

  @Get()
  async getParticipants(@Param('eventId') eventId: string): Promise<EventManagerDetailedDto[]> {
    return await this.eventManagerService.getParticipantsDetailed(eventId);
  }

  @Post()
  async inviteParticipant(
    @Param('eventId') eventId: string,
    @Body() dto: InviteManagerDto,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.eventManagerService.inviteParticipant(eventId, dto.userId, user.id!, dto.role, dto.chatHistoryAccess);
    return { success: true };
  }

  @Patch('me')
  async respondToInvite(
    @Param('eventId') eventId: string,
    @Body() dto: RespondToInviteDto,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.eventManagerService.respondToInvite(eventId, user.id!, dto.accept);
    return { success: true };
  }

  /** Self-serve join request (event.joinMode === 'approval') - see
   * EventManagerService.requestToJoin. Distinct from the plain self-attend
   * toggle (AttendanceController), which only applies to 'open' events. */
  @Post('join-request')
  async requestToJoin(@Param('eventId') eventId: string, @CurrentUser() user: UserDto): Promise<{ success: boolean }> {
    await this.eventManagerService.requestToJoin(eventId, user.id!);
    return { success: true };
  }

  /** Organizer-side approve/decline of someone else's join request - same
   * body shape as respondToInvite's PATCH me, but keyed by the requester's
   * userId (a route param) instead of the caller's own identity. */
  @Patch(':userId/join-request')
  async respondToJoinRequest(
    @Param('eventId') eventId: string,
    @Param('userId') requesterId: string,
    @Body() dto: RespondToInviteDto,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    if (dto.accept) {
      await this.eventManagerService.approveJoinRequest(eventId, requesterId, user.id!);
    } else {
      await this.eventManagerService.declineJoinRequest(eventId, requesterId, user.id!);
    }
    return { success: true };
  }

  @Delete(':userId')
  async removeParticipant(
    @Param('eventId') eventId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.eventManagerService.removeParticipant(eventId, user.id!, targetUserId);
    return { success: true };
  }
}
