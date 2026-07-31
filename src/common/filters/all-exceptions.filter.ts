import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nValidationException, I18nValidationError } from 'nestjs-i18n';
import { DomainException } from '../exceptions';

/**
 * Global filter that catches every unhandled exception and turns it
 * into a standardized JSON response:
 *
 * {
 *   "statusCode": 404,
 *   "timestamp": "2026-01-15T10:30:00.000Z",
 *   "path": "/api/events/123",
 *   "method": "GET",
 *   "error": "RESOURCE_NOT_FOUND",
 *   "message": "Event with id \"123\" not found"
 * }
 *
 * `message` is localized based on the client's Accept-Language header
 * (see I18nModule in AppModule): DomainException subclasses carry a
 * translation key/args resolved here, and DTO validation errors are
 * already translated by the ValidationPipe's i18n exceptionFactory.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.resolve(exception, host);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode} ${error}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }

  private resolve(
    exception: unknown,
    host: ArgumentsHost,
  ): {
    statusCode: number;
    error: string;
    message: string;
  } {
    if (exception instanceof I18nValidationException) {
      const message = this.flattenValidationErrors(exception.errors).join('; ');
      return {
        statusCode: exception.getStatus(),
        error: 'VALIDATION_ERROR',
        message: message || exception.message,
      };
    }

    if (exception instanceof DomainException && exception.translationKey) {
      const i18n = I18nContext.current(host);
      const translated = i18n?.t(exception.translationKey, {
        args: exception.translationArgs,
      });
      const message =
        typeof translated === 'string' && translated !== exception.translationKey
          ? translated
          : exception.message;
      return { statusCode: exception.getStatus(), error: exception.errorCode, message };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { statusCode: status, error: exception.name, message: res };
      }
      const body = res as { message?: unknown; error?: string };
      const message = Array.isArray(body.message)
        ? body.message.join('; ')
        : typeof body.message === 'string'
          ? body.message
          : exception.message;
      return {
        statusCode: status,
        error: body.error ?? exception.name,
        message,
      };
    }

    // Unknown / non-HTTP error
    const detail =
      exception instanceof Error ? exception.message : 'Unknown error';
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: detail,
    };
  }

  /**
   * class-validator nests one ValidationError per invalid property, with
   * child DTOs (e.g. socialLinks) reported as `children`. Each already-
   * translated constraint message lives in `constraints`.
   */
  private flattenValidationErrors(errors: I18nValidationError[]): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      if (error.children?.length) {
        messages.push(...this.flattenValidationErrors(error.children));
      }
    }
    return messages;
  }
}
