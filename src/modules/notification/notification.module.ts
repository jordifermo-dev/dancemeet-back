import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { UserRepository } from '../user/user.repository';
import { NOTIFICATION_MODEL, USER_MODEL } from '../../config/mongoose.config';
import { NotificationDocument } from './notification.schema';
import { UserDocument } from '../user/user.schema';

@Module({
  controllers: [NotificationController],
  providers: [
    {
      provide: NotificationService,
      useFactory: (notificationModel: Model<NotificationDocument>, userModel: Model<UserDocument>) => {
        const notificationRepository = new NotificationRepository(notificationModel);
        const userRepository = new UserRepository(userModel);
        return new NotificationService(notificationRepository, userRepository);
      },
      inject: [NOTIFICATION_MODEL, USER_MODEL],
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
