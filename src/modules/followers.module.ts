import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { FollowersController } from '../controllers/followers.controller';
import { FollowersService } from '../services/followers.service';
import { FollowersRepository } from '../repositories/followers.repository';
import { FOLLOWERS_MODEL } from '../config/mongoose.config';
import { FollowersDocument } from '../schemas/followers.schema';

@Module({
  controllers: [FollowersController],
  providers: [
    {
      provide: FollowersService,
      useFactory: (followersModel: Model<FollowersDocument>) => {
        const followersRepository = new FollowersRepository(followersModel);
        return new FollowersService(followersRepository);
      },
      inject: [FOLLOWERS_MODEL],
    },
  ],
  exports: [FollowersService],
})
export class FollowersModule {}
