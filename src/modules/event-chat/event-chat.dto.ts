import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MessageReaction } from './event-chat.schema';

const msg = (rule: string) => i18nValidationMessage(`errors.validation.${rule}`);

/** Raw shape, as stored - reactions here are the flat "who reacted what"
 * list (see MessageReaction). Only used internally between the repository
 * and the service; the API-facing shape is EventMessageWithSenderDto below,
 * whose `reactions` field is grouped-by-emoji instead. */
export class EventMessageDto {
  id?: string;
  eventId!: string;
  senderId!: string;
  text!: string;
  reactions!: MessageReaction[];
  createdAt!: number;
  editedAt?: number;
  deletedAt?: number;
  replyToMessageId?: string;
  attachedPhotoId?: string;
  attachedPhotoUrl?: string;
}

/** One emoji's reaction summary on a message, from one specific viewer's
 * point of view - grouped/counted by EventChatService.getMessagesDetailed,
 * never stored this way. */
export class GroupedReactionDto {
  emoji!: string;
  count!: number;
  reactedByMe!: boolean;
}

/** Hydrated for the xat's own message list - who sent it, plus the grouped
 * reaction summary for whoever's asking (see reactedByMe above). Not an
 * `extends EventMessageDto` - its `reactions` shape is intentionally
 * different (grouped, not the flat stored list), so it's a plain sibling
 * DTO instead of an incompatible override. */
export class EventMessageWithSenderDto {
  id!: string;
  eventId!: string;
  senderId!: string;
  senderName!: string;
  senderPhotoUrl?: string;
  text!: string;
  reactions!: GroupedReactionDto[];
  createdAt!: number;
  editedAt?: number;
  /** Derived from the stored deletedAt - readers only ever see this
   * boolean, never the timestamp (see EventChatService.hydrate). */
  deleted!: boolean;
  replyTo?: EventMessageQuoteDto | null;
  attachedPhoto?: EventMessageAttachedPhotoDto | null;
}

/** A small denormalized quote of another message, resolved at hydrate time -
 * not stored this way, and not the full EventMessageWithSenderDto shape
 * (a reply preview never needs reactions/attachments of the quoted message). */
export class EventMessageQuoteDto {
  id!: string;
  senderName!: string;
  text!: string;
  deleted!: boolean;
}

export class EventMessageAttachedPhotoDto {
  galleryPhotoId!: string;
  photoUrl!: string;
}

export class CreateEventMessageDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(1000, { message: msg('maxLength') })
  text!: string;

  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  replyToMessageId?: string;

  @IsOptional()
  @IsMongoId({ message: msg('isMongoId') })
  attachedPhotoId?: string;
}

export class EditEventMessageDto {
  @IsString({ message: msg('isString') })
  @IsNotEmpty({ message: msg('isNotEmpty') })
  @MaxLength(1000, { message: msg('maxLength') })
  text!: string;
}
