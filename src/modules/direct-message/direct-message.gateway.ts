import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getAuth } from 'firebase-admin/auth';
import { resolveAllowedOrigins } from '../../config/cors.config';
import { UserService } from '../user/user.service';
import { UserDto } from '../user/user.dto';
import { ConversationService } from './conversation.service';

interface AuthedSocketData {
  user?: UserDto;
}

/** Same handshake-auth skeleton as EventChatGateway (see that class's own,
 * fuller doc comment on why authentication runs as `server.use()` middleware
 * rather than a handleConnection listener) - room-per-conversation instead
 * of room-per-event, otherwise a direct mirror. */
@WebSocketGateway({
  namespace: '/direct-message',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, !origin || resolveAllowedOrigins().includes(origin));
    },
    credentials: true,
  },
})
export class DirectMessageGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly userService: UserService,
    private readonly conversationService: ConversationService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket: Socket, next: (err?: Error) => void) => {
      void this.authenticate(socket, next);
    });
  }

  private async authenticate(socket: Socket, next: (err?: Error) => void): Promise<void> {
    try {
      const token = socket.handshake.auth?.['token'] as string | undefined;
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      const decoded = await getAuth().verifyIdToken(token);
      if (!decoded.email) {
        next(new Error('unauthorized'));
        return;
      }
      const user = await this.userService.findByEmail(decoded.email);
      if (!user) {
        next(new Error('unauthorized'));
        return;
      }
      (socket.data as AuthedSocketData).user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  }

  handleDisconnect(): void {}

  @SubscribeMessage('join-conversation')
  async handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId) {
      return;
    }
    try {
      await this.conversationService.assertCanAccess(body.conversationId, user.id);
      await client.join(this.roomFor(body.conversationId));
    } catch {
      client.emit('join-conversation-error', { conversationId: body.conversationId });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; text: string; replyToMessageId?: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    const text = body?.text?.trim() ?? '';
    if (!user?.id || !body?.conversationId || !text) {
      return;
    }
    try {
      const message = await this.conversationService.sendMessage(body.conversationId, user.id, text, body.replyToMessageId);
      // Broadcast to the whole room, sender included - same "never render
      // optimistically, always wait for this echo" reasoning as event-chat.
      this.server.to(this.roomFor(body.conversationId)).emit('new-message', message);
    } catch {
      client.emit('send-message-error', { conversationId: body.conversationId });
    }
  }

  @SubscribeMessage('edit-message')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageId: string; text: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    const text = body?.text?.trim();
    if (!user?.id || !body?.conversationId || !body?.messageId || !text) {
      return;
    }
    try {
      const message = await this.conversationService.editMessage(body.conversationId, body.messageId, user.id, text);
      this.server.to(this.roomFor(body.conversationId)).emit('message-updated', message);
    } catch {
      client.emit('edit-message-error', { conversationId: body.conversationId, messageId: body.messageId });
    }
  }

  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageId: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId || !body?.messageId) {
      return;
    }
    try {
      const message = await this.conversationService.deleteMessage(body.conversationId, body.messageId, user.id);
      this.server.to(this.roomFor(body.conversationId)).emit('message-updated', message);
    } catch {
      client.emit('delete-message-error', { conversationId: body.conversationId, messageId: body.messageId });
    }
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId) {
      return;
    }
    try {
      await this.conversationService.markRead(body.conversationId, user.id);
    } catch {
      // Best-effort, same as event-chat's mark-chat-read.
    }
  }

  @SubscribeMessage('react-message')
  async handleReactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageId: string; emoji: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId || !body?.messageId || !body?.emoji) {
      return;
    }
    try {
      const reactions = await this.conversationService.reactToMessage(body.conversationId, body.messageId, user.id, body.emoji);
      this.server.to(this.roomFor(body.conversationId)).emit('message-reaction-updated', { messageId: body.messageId, reactions });
    } catch {
      client.emit('react-message-error', { conversationId: body.conversationId, messageId: body.messageId });
    }
  }

  @SubscribeMessage('unreact-message')
  async handleUnreactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageId: string; emoji: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId || !body?.messageId || !body?.emoji) {
      return;
    }
    try {
      const reactions = await this.conversationService.removeReaction(body.conversationId, body.messageId, user.id, body.emoji);
      this.server.to(this.roomFor(body.conversationId)).emit('message-reaction-updated', { messageId: body.messageId, reactions });
    } catch {
      client.emit('react-message-error', { conversationId: body.conversationId, messageId: body.messageId });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }): void {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId) {
      return;
    }
    client.to(this.roomFor(body.conversationId)).emit('user-typing', { userId: user.id, userName: user.name });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationId: string }): void {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.conversationId) {
      return;
    }
    client.to(this.roomFor(body.conversationId)).emit('user-stopped-typing', { userId: user.id });
  }

  private roomFor(conversationId: string): string {
    return `dm:${conversationId}`;
  }
}
