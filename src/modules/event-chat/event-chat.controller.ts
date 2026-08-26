import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { EventChatService } from './event-chat.service';
import { EventMessageWithSenderDto } from './event-chat.dto';

/** History-only - GET for the initial load/pagination when the xat tab
 * opens. There's deliberately no POST here: a message can only ever be sent
 * through the live socket connection (see EventChatGateway's 'send-message'
 * handler) - this app's xat has no "send while offline" story, unlike the
 * gallery's plain REST upload. */
@Controller('api/events/:eventId/messages')
@UseInterceptors(CurrentUserInterceptor)
export class EventChatController {
  constructor(private readonly eventChatService: EventChatService) {}

  @Get()
  async getMessages(
    @Param('eventId') eventId: string,
    @Query('before') before: string | undefined,
    @CurrentUser() user: UserDto,
  ): Promise<EventMessageWithSenderDto[]> {
    return await this.eventChatService.getMessagesDetailed(eventId, user.id!, before ? Number(before) : undefined);
  }
}
