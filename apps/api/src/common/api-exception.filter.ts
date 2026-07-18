import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  apiErrorResponseSchema,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ValidationIssue,
} from '@nestra/contracts';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

import { ApiException } from './api.exception';
import type { RequestWithId } from './request-id.middleware';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter<unknown> {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<unknown>();
    const statusCode = this.getStatusCode(exception);
    const errorCode = this.getErrorCode(exception, statusCode);
    const validationIssues = this.getValidationIssues(exception);

    const errorResponse: ApiErrorResponse = apiErrorResponseSchema.parse({
      statusCode,
      errorCode,
      message: this.getSafeMessage(exception, errorCode),
      ...(validationIssues === undefined ? {} : { validationIssues }),
      requestPath: request.path,
      ...(request.requestId === undefined ? {} : { requestId: request.requestId }),
      timestamp: new Date().toISOString(),
    });

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled API error: code=${errorCode} requestId=${request.requestId ?? 'unavailable'}`,
      );
    }

    this.httpAdapterHost.httpAdapter.reply(response, errorResponse, statusCode);
  }

  private getStatusCode(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorCode(exception: unknown, statusCode: number): ApiErrorCode {
    if (exception instanceof ApiException) {
      return exception.errorCode;
    }

    if (exception instanceof ZodValidationException) {
      return 'VALIDATION_FAILED';
    }

    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_FAILED';
      case HttpStatus.NOT_FOUND:
        return 'ROUTE_NOT_FOUND';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private getSafeMessage(exception: unknown, errorCode: ApiErrorCode): string {
    if (exception instanceof ApiException) {
      return exception.safeMessage;
    }

    switch (errorCode) {
      case 'VALIDATION_FAILED':
        return 'Request validation failed.';
      case 'ROUTE_NOT_FOUND':
        return 'The requested route was not found.';
      case 'SERVICE_UNAVAILABLE':
        return 'Service is temporarily unavailable.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  private getValidationIssues(exception: unknown): readonly ValidationIssue[] | undefined {
    if (!(exception instanceof ZodValidationException)) {
      return undefined;
    }

    const zodError: unknown = exception.getZodError();

    if (!(zodError instanceof z.ZodError)) {
      return undefined;
    }

    return zodError.issues.map((issue) => ({
      fieldPath: issue.path.join('.'),
      errorCode: issue.code,
    }));
  }
}
