import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when an ID parameter is not a valid Mongo ObjectId.
 */
export class InvalidIdException extends DomainException {
  constructor(resource: string, id: string) {
    super(
      `Invalid ${resource} id: "${id}"`,
      HttpStatus.BAD_REQUEST,
      'INVALID_ID',
      'errors.INVALID_ID',
      { resource, id },
    );
  }
}
