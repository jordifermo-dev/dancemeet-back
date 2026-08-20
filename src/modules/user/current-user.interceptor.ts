import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, from, switchMap } from 'rxjs';
import { UnauthenticatedException } from '../../common';
import { FirebaseUser } from '../../common/guards/firebase-auth.guard';
import { UserService } from './user.service';

/**
 * Resolves the app UserDto behind the Firebase identity FirebaseAuthGuard
 * already verified (request.firebaseUser), and attaches it as
 * request.currentUser for @CurrentUser() to read. Lives in the user domain
 * (not common/) because it needs UserService - FirebaseAuthGuard itself
 * stays domain-free and only resolves the raw Firebase identity.
 *
 * Applied per-controller/route with @UseInterceptors(CurrentUserInterceptor),
 * not globally - most read-only endpoints don't need "who's calling".
 */
@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly userService: UserService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { firebaseUser?: FirebaseUser; currentUser?: unknown }>();
    const email = request.firebaseUser?.email;
    if (!email) {
      throw new UnauthenticatedException();
    }

    return from(this.userService.findByEmail(email)).pipe(
      switchMap((user) => {
        if (!user) {
          throw new UnauthenticatedException();
        }
        request.currentUser = user;
        return next.handle();
      }),
    );
  }
}
