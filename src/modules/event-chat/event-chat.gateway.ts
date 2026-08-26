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
import { EventService } from '../event/event.service';
import { EventChatService } from './event-chat.service';

interface AuthedSocketData {
  user?: UserDto;
}

/** The app's first real-time piece - a Socket.IO namespace, not the plain
 * REST FirebaseAuthGuard/CurrentUserInterceptor pair the rest of the API
 * uses (those only run on the HTTP request pipeline, a socket handshake
 * never goes through them) - afterInit below replicates that same two-step
 * chain by hand: verify the Firebase ID token, then resolve it to this app's
 * own UserDto by email.
 *
 * This runs as `server.use()` handshake middleware, not `handleConnection` -
 * a plain OnGatewayConnection listener does NOT block the client from
 * receiving 'connect' (and immediately emitting 'join-event') while that
 * listener's async token verification is still in flight, so the client's
 * very first message could arrive before client.data.user was ever set. A
 * handshake middleware runs *before* the client is told it's connected at
 * all, so client.data.user is guaranteed set (or the connection is refused
 * outright) by the time any message handler below ever runs. */
@WebSocketGateway({
  namespace: '/event-chat',
  cors: {
    // A function (not a static array) so it re-reads CORS_ORIGINS on every
    // connection attempt instead of whatever main.ts's import order/timing
    // happened to have baked in at class-load time - see cors.config.ts.
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, !origin || resolveAllowedOrigins().includes(origin));
    },
    credentials: true,
  },
})
export class EventChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly userService: UserService,
    private readonly eventService: EventService,
    private readonly eventChatService: EventChatService,
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

  /** Nothing explicit needed - Socket.IO already removes the socket from
   * every room it had joined, and any "escribiendo..." it left behind
   * expires on its own via the receiving client's own timeout (see
   * event-chat-socket.service.ts, frontend). */
  handleDisconnect(): void {}

  @SubscribeMessage('join-event')
  async handleJoinEvent(@ConnectedSocket() client: Socket, @MessageBody() body: { eventId: string }): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId) {
      return;
    }
    try {
      await this.eventService.assertCanAccessPrivateArea(body.eventId, user.id);
      await client.join(this.roomFor(body.eventId));
    } catch {
      client.emit('join-event-error', { eventId: body.eventId });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; text: string; replyToMessageId?: string; attachedPhotoId?: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    const text = body?.text?.trim() ?? '';
    // A photo mention can be sent with no caption at all - only reject when
    // there's neither text nor an attached photo to say something with.
    if (!user?.id || !body?.eventId || (!text && !body?.attachedPhotoId)) {
      return;
    }
    try {
      const message = await this.eventChatService.sendMessage(
        body.eventId,
        user.id,
        text,
        body.replyToMessageId,
        body.attachedPhotoId,
      );
      // Broadcast to the whole room, sender included - the client never
      // renders optimistically, it always waits for this echo (see
      // event-chat-socket.service.ts's own doc comment).
      this.server.to(this.roomFor(body.eventId)).emit('new-message', message);
    } catch {
      client.emit('send-message-error', { eventId: body.eventId });
    }
  }

  @SubscribeMessage('edit-message')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; messageId: string; text: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    const text = body?.text?.trim();
    if (!user?.id || !body?.eventId || !body?.messageId || !text) {
      return;
    }
    try {
      const message = await this.eventChatService.editMessage(body.eventId, body.messageId, user.id, text);
      this.server.to(this.roomFor(body.eventId)).emit('message-updated', message);
    } catch {
      client.emit('edit-message-error', { eventId: body.eventId, messageId: body.messageId });
    }
  }

  /** A "deleted" message is just a message whose `deleted` flag flipped -
   * broadcast on the same `message-updated` event as an edit, rather than a
   * separate event name/frontend code path. */
  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; messageId: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId || !body?.messageId) {
      return;
    }
    try {
      const message = await this.eventChatService.deleteMessage(body.eventId, body.messageId, user.id);
      this.server.to(this.roomFor(body.eventId)).emit('message-updated', message);
    } catch {
      client.emit('delete-message-error', { eventId: body.eventId, messageId: body.messageId });
    }
  }

  /** Purely the caller's own read-state - no broadcast to the room. */
  @SubscribeMessage('mark-chat-read')
  async handleMarkChatRead(@ConnectedSocket() client: Socket, @MessageBody() body: { eventId: string }): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId) {
      return;
    }
    try {
      await this.eventChatService.markChatRead(body.eventId, user.id);
    } catch {
      // Read-state is best-effort - no error event, a missed mark-read just
      // means the unread badge doesn't clear until the next successful one.
    }
  }

  @SubscribeMessage('react-message')
  async handleReactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; messageId: string; emoji: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId || !body?.messageId || !body?.emoji) {
      return;
    }
    try {
      const reactions = await this.eventChatService.reactToMessage(body.eventId, body.messageId, user.id, body.emoji);
      this.server.to(this.roomFor(body.eventId)).emit('message-reaction-updated', { messageId: body.messageId, reactions });
    } catch {
      client.emit('react-message-error', { eventId: body.eventId, messageId: body.messageId });
    }
  }

  @SubscribeMessage('unreact-message')
  async handleUnreactMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { eventId: string; messageId: string; emoji: string },
  ): Promise<void> {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId || !body?.messageId || !body?.emoji) {
      return;
    }
    try {
      const reactions = await this.eventChatService.removeReaction(body.eventId, body.messageId, user.id, body.emoji);
      this.server.to(this.roomFor(body.eventId)).emit('message-reaction-updated', { messageId: body.messageId, reactions });
    } catch {
      client.emit('react-message-error', { eventId: body.eventId, messageId: body.messageId });
    }
  }

  /** Purely ephemeral relay, no persistence and no extra authorization check
   * (join-event already gated room membership - only room members receive
   * these anyway). */
  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { eventId: string }): void {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId) {
      return;
    }
    client.to(this.roomFor(body.eventId)).emit('user-typing', { userId: user.id, userName: user.name });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { eventId: string }): void {
    const user = (client.data as AuthedSocketData).user;
    if (!user?.id || !body?.eventId) {
      return;
    }
    client.to(this.roomFor(body.eventId)).emit('user-stopped-typing', { userId: user.id });
  }

  private roomFor(eventId: string): string {
    return `event:${eventId}`;
  }
}
