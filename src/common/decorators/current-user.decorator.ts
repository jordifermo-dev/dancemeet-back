import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Reads the app UserDto that CurrentUserInterceptor (modules/user/) already
 * resolved and attached to the request as `currentUser`. Only reads a
 * request property - doesn't depend on UserService itself, so it can live
 * here alongside @Public() instead of inside the user domain.
 *
 * Only usable on routes whose controller also has
 * `@UseInterceptors(CurrentUserInterceptor)` - otherwise `request.currentUser`
 * is never set.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { currentUser?: unknown }>();
  return request.currentUser;
});
