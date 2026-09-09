import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MessageReaction } from '../event-chat/event-chat.schema';
import { GroupedReactionDto } from '../event-chat/event-chat.dto';
import { ConversationStatus } from './conversation.schema';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

/** Raw shape, as stored - see event-chat.dto.ts's EventMessageDto, same
 * split between the flat stored `reactions` and the grouped-by-emoji shape
 * exposed to the API (DirectMessageWithSenderDto below). */
export class DirectMessageDto {
  id?: string;
  conversationId!: string;
  senderId!: string;
  text!: string;
  reactions!: MessageReaction[];
  createdAt!: number;
  editedAt?: number;
  deletedAt?: number;
  replyToMessageId?: string;
}

export class DirectMessageQuoteDto {
  id!: string;
  senderName!: string;
  text!: string;
  deleted!: boolean;
}

/** Hydrated for the conversation's own message list - GroupedReactionDto is
 * reused as-is from event-chat.dto.ts (identical shape: emoji/count/
 * reactedByMe, nothing eventId-specific about it). */
export class DirectMessageWithSenderDto {
  id!: string;
  conversationId!: string;
  senderId!: string;
  senderName!: string;
  senderPhotoUrl?: string;
  text!: string;
  reactions!: GroupedReactionDto[];
  createdAt!: number;
  editedAt?: number;
  deleted!: boolean;
  replyTo?: DirectMessageQuoteDto | null;
}

export class ConversationDto {
  id?: string;
  participantIds!: string[];
  status!: ConversationStatus;
  requestedBy!: string;
  createdAt!: number;
  lastMessageAt?: number;
  lastReadAt!: Record<string, number>;
}

/** One row of the Chats tab's 1:1 section - the conversation hydrated with
 * the *other* participant's profile and a preview of the last message, same
 * "batch-enrich, no per-row request" spirit as FavoritedEventDto/
 * AttendedEventDto. unreadCount mirrors those DTOs' own unread badges. */
export class ConversationDetailedDto {
  id!: string;
  status!: ConversationStatus;
  requestedBy!: string;
  createdAt!: number;
  lastMessageAt?: number;
  peerId!: string;
  peerName!: string;
  peerPhotoUrl?: string;
  lastMessagePreview?: string;
  unreadCount!: number;
}

export class CreateConversationDto {
  @IsMongoId({ message: msg('isMongoId') })
  peerId!: string;
}

export class CreateDirectMessageDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(1000, { message: msg('maxLength') })
  text!: string;

  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  replyToMessageId?: string;
}

export class EditDirectMessageDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(1000, { message: msg('maxLength') })
  text!: string;
}
