import { CanActivate, ExecutionContext, HttpStatus, Injectable, type Type } from '@nestjs/common';
import type { Request } from 'express';

import { ApiException } from '../common/api.exception';
import { AccessTokenService, type VerifiedAccessToken } from './access-token.service';

export type RequestWithAccessToken = Request & {
  accessToken?: VerifiedAccessToken;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAccessToken>();
    const authorizationHeader = request.header('authorization');

    if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = authorizationHeader.slice('Bearer '.length).trim();

    if (accessToken.length === 0) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const verifiedAccessToken = await this.accessTokenService.verifyAccessToken(accessToken);

    if (verifiedAccessToken === null) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.accessToken = verifiedAccessToken;
    return true;
  }
}

export function createJwtAuthGuard(): Type<CanActivate> {
  return JwtAuthGuard;
}
