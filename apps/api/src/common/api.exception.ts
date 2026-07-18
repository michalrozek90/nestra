import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ApiErrorCode } from '@nestra/contracts';

export class ApiException extends HttpException {
  constructor(
    readonly errorCode: ApiErrorCode,
    readonly safeMessage: string,
    statusCode: HttpStatus,
  ) {
    super(safeMessage, statusCode);
  }
}
