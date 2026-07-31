import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

/**
 * Thrown when a business rule is violated (e.g. duplicate favorite,
 * trying to follow yourself, removing a non-existent relationship).
 *
 * `message` is the English fallback; pass `translationKey`/`translationArgs`
 * so the global filter can render it in the client's requested language.
 */
export class BusinessRuleException extends DomainException {
  constructor(message: string, translationKey?: string, translationArgs?: Record<string, unknown>) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'BUSINESS_RULE_VIOLATION',
      translationKey,
      translationArgs,
    );
  }
}
