import { forwardRef, Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { FollowersController } from '../controllers/followers.controller';
import { FollowersService } from '../services/followers.service';
import { FollowersRepository } from '../repositories/followers.repository';
import { UserService } from '../services/user.service';
import { UserModule } from './user.module';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { FOLLOWERS_MODEL } from '../config/mongoose.config';
import { FollowersDocument } from '../schemas/followers.schema';

@Module({
  // Circular with UserModule - see UserModule's own comment for why.
  imports: [forwardRef(() => UserModule), NotificationModule],
  controllers: [FollowersController],
  providers: [
    {
      provide: FollowersService,
      useFactory: (
        followersModel: Model<FollowersDocument>,
        userService: UserService,
        notificationService: NotificationService,
      ) => {
        const followersRepository = new FollowersRepository(followersModel);
        return new FollowersService(followersRepository, userService, notificationService);
      },
      // forwardRef() on the injected token itself - see UserModule's
      // identical comment for why the cast is needed and safe.
      inject: [FOLLOWERS_MODEL, forwardRef(() => UserService) as unknown as typeof UserService, NotificationService],
    },
  ],
  exports: [FollowersService],
})
export class FollowersModule {}
