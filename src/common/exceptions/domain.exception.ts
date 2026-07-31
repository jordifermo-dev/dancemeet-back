import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all domain-level exceptions.
 * Domain exceptions represent business / data-layer problems and
 * carry an HTTP status so the global filter can format a consistent
 * JSON response without leaking driver-specific details.
 *
 * `message` is always the English fallback (used for logs and as a
 * last resort if translation is unavailable). `translationKey` +
 * `translationArgs` let the global filter render the message in the
 * language requested by the client (see AllExceptionsFilter).
 */
export class DomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly errorCode: string,
    public readonly translationKey?: string,
    public readonly translationArgs?: Record<string, unknown>,
  ) {
    super({ statusCode: status, message, error: errorCode }, status);
  }
}
