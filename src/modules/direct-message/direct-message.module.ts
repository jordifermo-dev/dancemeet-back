import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { DirectMessageController } from './direct-message.controller';
import { DirectMessageGateway } from './direct-message.gateway';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { DirectMessageRepository } from './direct-message.repository';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { FollowersModule } from '../followers/followers.module';
import { FollowersService } from '../followers/followers.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { CONVERSATION_MODEL, DIRECT_MESSAGE_MODEL } from '../../config/mongoose.config';
import { ConversationDocument } from './conversation.schema';
import { DirectMessageDocument } from './direct-message.schema';

@Module({
  // Plain (non-circular) imports, same reasoning as EventChatModule's own -
  // nothing in UserModule/FollowersModule/NotificationModule needs to call
  // back into this module.
  imports: [UserModule, FollowersModule, NotificationModule],
  controllers: [DirectMessageController],
  providers: [
    {
      provide: ConversationService,
      useFactory: (
        conversationModel: Model<ConversationDocument>,
        directMessageModel: Model<DirectMessageDocument>,
        userService: UserService,
        followersService: FollowersService,
        notificationService: NotificationService,
      ) => {
        const conversationRepository = new ConversationRepository(conversationModel);
        const directMessageRepository = new DirectMessageRepository(directMessageModel);
        return new ConversationService(conversationRepository, directMessageRepository, userService, followersService, notificationService);
      },
      inject: [CONVERSATION_MODEL, DIRECT_MESSAGE_MODEL, UserService, FollowersService, NotificationService],
    },
    DirectMessageGateway,
  ],
  exports: [ConversationService],
})
export class DirectMessageModule {}
