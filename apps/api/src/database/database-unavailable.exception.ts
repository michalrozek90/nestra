import { HttpStatus } from '@nestjs/common';

import { ApiException } from '../common/api.exception';

export class DatabaseUnavailableException extends ApiException {
  constructor(cause: unknown) {
    super(
      'SERVICE_UNAVAILABLE',
      'Service is temporarily unavailable.',
      HttpStatus.SERVICE_UNAVAILABLE,
      { cause },
    );
  }
}
