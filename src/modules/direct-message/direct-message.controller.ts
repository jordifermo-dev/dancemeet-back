import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { ConversationService } from './conversation.service';
import { ConversationDetailedDto, CreateConversationDto, DirectMessageWithSenderDto } from './direct-message.dto';

/** Same "no plain REST write route for messages" reasoning as
 * EventChatController - a message can only be sent through the live socket
 * (DirectMessageGateway's send-message handler). The conversation-level
 * actions here (create/accept/decline) have no socket equivalent, since
 * they don't need to be "live" the way a message does. */
@Controller('api/conversations')
@UseInterceptors(CurrentUserInterceptor)
export class DirectMessageController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  async listConversations(@CurrentUser() user: UserDto): Promise<ConversationDetailedDto[]> {
    return this.conversationService.listConversationsForUser(user.id!);
  }

  @Post()
  async createConversation(@Body() body: CreateConversationDto, @CurrentUser() user: UserDto): Promise<ConversationDetailedDto> {
    return this.conversationService.getOrCreateConversation(user.id!, body.peerId);
  }

  @Get(':conversationId')
  async getConversation(@Param('conversationId') conversationId: string, @CurrentUser() user: UserDto): Promise<ConversationDetailedDto> {
    return this.conversationService.getConversation(conversationId, user.id!);
  }

  @Get(':conversationId/messages')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('before') before: string | undefined,
    @CurrentUser() user: UserDto,
  ): Promise<DirectMessageWithSenderDto[]> {
    return this.conversationService.getMessagesDetailed(conversationId, user.id!, before ? Number(before) : undefined);
  }

  @Patch(':conversationId/accept')
  async acceptConversation(@Param('conversationId') conversationId: string, @CurrentUser() user: UserDto): Promise<{ success: true }> {
    await this.conversationService.acceptConversation(conversationId, user.id!);
    return { success: true };
  }

  @Delete(':conversationId')
  async declineConversation(@Param('conversationId') conversationId: string, @CurrentUser() user: UserDto): Promise<{ success: true }> {
    await this.conversationService.declineConversation(conversationId, user.id!);
    return { success: true };
  }
}
