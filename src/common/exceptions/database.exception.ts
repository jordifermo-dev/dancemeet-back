import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when an unexpected database error occurs.
 */
export class DatabaseException extends DomainException {
  constructor(operation: string, cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : 'Unknown error';
    super(
      `Database error during ${operation}: ${detail}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
      'errors.DATABASE_ERROR',
      { operation, detail },
    );
  }
}
