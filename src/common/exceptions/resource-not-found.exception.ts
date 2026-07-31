import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when a requested resource cannot be found.
 */
export class ResourceNotFoundException extends DomainException {
  constructor(
    resource: string,
    identifier?: string,
    translationKey?: string,
    translationArgs?: Record<string, unknown>,
  ) {
    const msg = identifier
      ? `${resource} with id "${identifier}" not found`
      : `${resource} not found`;
    super(
      msg,
      HttpStatus.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      translationKey ?? (identifier ? 'errors.RESOURCE_NOT_FOUND' : 'errors.RESOURCE_NOT_FOUND_GENERIC'),
      translationArgs ?? { resource, identifier },
    );
  }
}
