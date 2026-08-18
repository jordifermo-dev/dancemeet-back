import { forwardRef, Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { FollowersService } from '../services/followers.service';
import { FollowersModule } from './followers.module';
import { USER_MODEL } from '../config/mongoose.config';
import { UserDocument } from '../schemas/user.schema';

@Module({
  // Circular: FollowersService.follow() needs a user's name for the
  // notification, UserService needs FollowersService for follower/following
  // counts - forwardRef() on both sides (see FollowersModule) is NestJS's
  // documented way to resolve this without either domain reaching into the
  // other's repository directly.
  imports: [forwardRef(() => FollowersModule)],
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useFactory: (userModel: Model<UserDocument>, followersService: FollowersService) => {
        const userRepository = new UserRepository(userModel);
        return new UserService(userRepository, followersService);
      },
      // forwardRef() on the injected token itself, not just the module
      // import above - the @nestjs/common types for FactoryProvider.inject
      // don't declare ForwardReference as an allowed element, but Nest's
      // injector explicitly unwraps a `{ forwardRef: () => X }` object at
      // runtime (see injector.js), so the cast is safe.
      inject: [USER_MODEL, forwardRef(() => FollowersService) as unknown as typeof FollowersService],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
