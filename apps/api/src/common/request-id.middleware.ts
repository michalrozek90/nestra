import { randomUUID } from 'node:crypto';

import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const requestIdSchema = z.uuid();

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const requestStartedAtMs = Date.now();
    const incomingRequestId = request.header('x-request-id');
    const requestIdParseResult = requestIdSchema.safeParse(incomingRequestId);
    const requestId = requestIdParseResult.success ? requestIdParseResult.data : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    response.once('finish', () => {
      const requestDurationMs = Date.now() - requestStartedAtMs;

      this.logger.log(
        `requestId=${requestId} method=${request.method} path=${request.path} statusCode=${response.statusCode} durationMs=${requestDurationMs}`,
      );
    });
    next();
  }
}
