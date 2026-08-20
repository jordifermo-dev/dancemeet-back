import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { CurrentUserInterceptor } from './current-user.interceptor';
import { FollowersModule } from '../followers/followers.module';
import { USER_MODEL } from '../../config/mongoose.config';
import { UserDocument } from './user.schema';

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
    // Plain @Injectable() class, not a useFactory - Nest resolves its
    // UserService constructor param via standard reflection since UserService
    // is already provided above, same as FirebaseAuthGuard's own Reflector param.
    CurrentUserInterceptor,
  ],
  exports: [UserService, CurrentUserInterceptor],
})
export class UserModule {}
