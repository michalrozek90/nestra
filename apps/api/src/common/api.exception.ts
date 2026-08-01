import { HttpException, type HttpExceptionOptions, type HttpStatus } from '@nestjs/common';
import type { ApiErrorCode } from '@nestra/contracts';

export class ApiException extends HttpException {
  constructor(
    readonly errorCode: ApiErrorCode,
    readonly safeMessage: string,
    statusCode: HttpStatus,
    options?: HttpExceptionOptions,
  ) {
    super(safeMessage, statusCode, options);
  }
}
