import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { ApiEnvironment } from '../config/api-environment';

export const ACCESS_TOKEN_ISSUER = 'nestra-api';
export const ACCESS_TOKEN_AUDIENCE = 'nestra-client';

export type AccessTokenPayload = {
  readonly sub: string;
  readonly sessionId: string;
  readonly iat: number;
  readonly exp: number;
  readonly iss: typeof ACCESS_TOKEN_ISSUER;
  readonly aud: typeof ACCESS_TOKEN_AUDIENCE;
};

export type VerifiedAccessToken = {
  readonly userId: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
};

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ApiEnvironment, true>,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sessionId,
      },
      {
        secret: this.configService.get('jwtAccessSecret', { infer: true }),
        expiresIn: this.configService.get('jwtAccessExpiresIn', { infer: true }),
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      },
    );
  }

  async verifyAccessToken(accessToken: string): Promise<VerifiedAccessToken | null> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken, {
        secret: this.configService.get('jwtAccessSecret', { infer: true }),
        issuer: ACCESS_TOKEN_ISSUER,
        audience: ACCESS_TOKEN_AUDIENCE,
      });

      if (typeof payload.sub !== 'string' || typeof payload.sessionId !== 'string') {
        return null;
      }

      if (typeof payload.exp !== 'number') {
        return null;
      }

      return {
        userId: payload.sub,
        sessionId: payload.sessionId,
        expiresAt: new Date(payload.exp * 1_000),
      };
    } catch {
      return null;
    }
  }

  async getAccessTokenExpiresAt(accessToken: string): Promise<Date> {
    const verifiedAccessToken = await this.verifyAccessToken(accessToken);

    if (verifiedAccessToken === null) {
      throw new Error('Access token verification failed while resolving expiry.');
    }

    return verifiedAccessToken.expiresAt;
  }
}
