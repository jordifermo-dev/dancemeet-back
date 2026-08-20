import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when an authenticated user is recognized but not allowed to perform
 * the requested action (e.g. editing/deleting an event they don't own or
 * manage) - distinct from UnauthenticatedException (401, no/invalid token).
 */
export class ForbiddenActionException extends DomainException {
  constructor(message: string, translationKey?: string, translationArgs?: Record<string, unknown>) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      'FORBIDDEN_ACTION',
      translationKey,
      translationArgs,
    );
  }
}
