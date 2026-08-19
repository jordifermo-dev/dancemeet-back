import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { FollowersModule } from './followers.module';
import { USER_MODEL } from '../config/mongoose.config';
import { UserDocument } from '../schemas/user.schema';

@Module({
  // Circular with FollowersModule (see that module's comment) - forwardRef()
  // is still required here for Nest to resolve the *module* graph. UserService
  // itself no longer constructor-injects FollowersService though: it resolves
  // it lazily via ModuleRef (see UserService), because a useFactory provider
  // runs once, synchronously, before a forwardRef()'d circular *provider*
  // actually exists - injecting it directly here produced null at runtime.
  imports: [forwardRef(() => FollowersModule)],
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useFactory: (userModel: Model<UserDocument>, moduleRef: ModuleRef) => {
        const userRepository = new UserRepository(userModel);
        return new UserService(userRepository, moduleRef);
      },
      inject: [USER_MODEL, ModuleRef],
    },
  ],
  exports: [UserService],
})
export class UserModule {}
