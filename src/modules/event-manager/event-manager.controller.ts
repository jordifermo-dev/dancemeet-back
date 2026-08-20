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
    await this.eventManagerService.inviteParticipant(eventId, dto.userId, user.id!, dto.role);
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
