import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { FollowersRepository } from '../repositories/followers.repository';
import { USER_MODEL, FOLLOWERS_MODEL } from '../config/mongoose.config';
import { UserDocument } from '../schemas/user.schema';
import { FollowersDocument } from '../schemas/followers.schema';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useFactory: (userModel: Model<UserDocument>, followersModel: Model<FollowersDocument>) => {
        const userRepository = new UserRepository(userModel);
        const followersRepository = new FollowersRepository(followersModel);
        return new UserService(userRepository, followersRepository);
      },
      inject: [USER_MODEL, FOLLOWERS_MODEL],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
