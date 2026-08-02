import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '../repositories/user.repository';
import { NOTIFICATION_MODEL, USER_MODEL } from '../config/mongoose.config';
import { NotificationDocument } from '../schemas/notification.schema';
import { UserDocument } from '../schemas/user.schema';

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
