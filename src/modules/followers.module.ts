import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { FollowersController } from '../controllers/followers.controller';
import { FollowersService } from '../services/followers.service';
import { FollowersRepository } from '../repositories/followers.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { FOLLOWERS_MODEL, USER_MODEL } from '../config/mongoose.config';
import { FollowersDocument } from '../schemas/followers.schema';
import { UserDocument } from '../schemas/user.schema';

@Module({
  imports: [NotificationModule],
  controllers: [FollowersController],
  providers: [
    {
      provide: FollowersService,
      useFactory: (
        followersModel: Model<FollowersDocument>,
        userModel: Model<UserDocument>,
        notificationService: NotificationService,
      ) => {
        const followersRepository = new FollowersRepository(followersModel);
        const userRepository = new UserRepository(userModel);
        return new FollowersService(followersRepository, userRepository, notificationService);
      },
      inject: [FOLLOWERS_MODEL, USER_MODEL, NotificationService],
    },
  ],
  exports: [FollowersService],
})
export class FollowersModule {}
