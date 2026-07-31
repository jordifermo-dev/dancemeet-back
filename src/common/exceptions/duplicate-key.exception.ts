import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when a unique constraint is violated (duplicate key, unique index).
 */
export class DuplicateKeyException extends DomainException {
  constructor(resource: string, field?: string) {
    const msg = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(
      msg,
      HttpStatus.CONFLICT,
      'DUPLICATE_KEY',
      field ? 'errors.DUPLICATE_KEY_FIELD' : 'errors.DUPLICATE_KEY',
      { resource, field },
    );
  }
}
