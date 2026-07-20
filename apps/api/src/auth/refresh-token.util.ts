import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

const refreshSessionIdSchema = z.uuid();

export type ParsedRefreshToken = {
  readonly sessionId: string;
  readonly token: string;
};

export function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

export function generateRefreshTokenSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function buildRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(refreshToken: string): ParsedRefreshToken | null {
  const separatorIndex = refreshToken.indexOf('.');

  if (separatorIndex <= 0 || separatorIndex === refreshToken.length - 1) {
    return null;
  }

  const sessionId = refreshToken.slice(0, separatorIndex);
  const sessionIdParseResult = refreshSessionIdSchema.safeParse(sessionId);

  if (!sessionIdParseResult.success) {
    return null;
  }

  return {
    sessionId: sessionIdParseResult.data,
    token: refreshToken,
  };
}

export function areTokenHashesEqual(expectedHash: string, actualHash: string): boolean {
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(actualHash, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
