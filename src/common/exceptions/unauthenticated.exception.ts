import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when a request to a private endpoint is missing a valid
 * Firebase ID token.
 */
export class UnauthenticatedException extends DomainException {
  constructor() {
    super(
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
      'UNAUTHENTICATED',
      'errors.UNAUTHENTICATED',
    );
  }
}
