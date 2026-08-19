import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { FollowersController } from '../controllers/followers.controller';
import { FollowersService } from '../services/followers.service';
import { FollowersRepository } from '../repositories/followers.repository';
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
        moduleRef: ModuleRef,
        notificationService: NotificationService,
      ) => {
        const followersRepository = new FollowersRepository(followersModel);
        return new FollowersService(followersRepository, moduleRef, notificationService);
      },
      inject: [FOLLOWERS_MODEL, ModuleRef, NotificationService],
    },
  ],
  exports: [FollowersService],
})
export class FollowersModule {}
