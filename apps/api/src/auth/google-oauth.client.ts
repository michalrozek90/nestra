import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeChallengeMethod, type LoginTicket, OAuth2Client } from 'google-auth-library';

import type { ApiEnvironment } from '../config/api-environment';
import { GoogleOAuthVerificationError } from './google-oauth.errors';

export type VerifiedGoogleIdentity = {
  readonly subject: string;
  readonly email: string;
  readonly nonce: string;
};

export interface GoogleOAuthClient {
  createAuthorizationUrl(input: {
    readonly state: string;
    readonly pkceChallenge: string;
    readonly nonce: string;
  }): string;
  exchangeAndVerifyCode(input: {
    readonly code: string;
    readonly pkceVerifier: string;
    readonly expectedNonce: string;
  }): Promise<VerifiedGoogleIdentity>;
}

export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

@Injectable()
export class GoogleOAuthClientService implements GoogleOAuthClient {
  constructor(private readonly configService: ConfigService<ApiEnvironment, true>) {}

  createAuthorizationUrl(input: {
    readonly state: string;
    readonly pkceChallenge: string;
    readonly nonce: string;
  }): string {
    const googleOAuth = this.getEnabledConfig();
    const client = this.createClient(googleOAuth);
    const authorizationUrl = client.generateAuthUrl({
      response_type: 'code',
      access_type: 'online',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state: input.state,
      code_challenge: input.pkceChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      nonce: input.nonce,
      redirect_uri: googleOAuth.callbackUri,
    });
    const parsedUrl = new URL(authorizationUrl);
    parsedUrl.searchParams.set('response_mode', 'form_post');
    return parsedUrl.toString();
  }

  async exchangeAndVerifyCode(input: {
    readonly code: string;
    readonly pkceVerifier: string;
    readonly expectedNonce: string;
  }): Promise<VerifiedGoogleIdentity> {
    const googleOAuth = this.getEnabledConfig();
    const client = this.createClient(googleOAuth);

    let idToken: string;
    try {
      const tokenResponse = await client.getToken({
        code: input.code,
        codeVerifier: input.pkceVerifier,
        redirect_uri: googleOAuth.callbackUri,
      });
      const receivedIdToken = tokenResponse.tokens.id_token;
      if (receivedIdToken === undefined || receivedIdToken === null) {
        throw new GoogleOAuthVerificationError('exchange_failed');
      }
      idToken = receivedIdToken;
    } catch (error: unknown) {
      if (error instanceof GoogleOAuthVerificationError) {
        throw error;
      }
      throw new GoogleOAuthVerificationError('exchange_failed');
    }

    let claims: ReturnType<LoginTicket['getPayload']>;
    try {
      const verificationPromise: Promise<LoginTicket> = client.verifyIdToken({
        idToken,
        audience: googleOAuth.clientId,
      });
      const verification = await verificationPromise;
      claims = verification.getPayload();
    } catch {
      throw new GoogleOAuthVerificationError('invalid_claims');
    }

    if (
      claims === undefined ||
      (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') ||
      claims.nonce !== input.expectedNonce ||
      typeof claims.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      typeof claims.nonce !== 'string'
    ) {
      throw new GoogleOAuthVerificationError('invalid_claims');
    }

    if (claims.email_verified !== true) {
      throw new GoogleOAuthVerificationError('unverified_email');
    }

    return { subject: claims.sub, email: claims.email, nonce: claims.nonce };
  }

  private createClient(
    googleOAuth: Extract<ApiEnvironment['googleOAuth'], { enabled: true }>,
  ): OAuth2Client {
    return new OAuth2Client({
      clientId: googleOAuth.clientId,
      clientSecret: googleOAuth.clientSecret,
      redirectUri: googleOAuth.callbackUri,
    });
  }

  private getEnabledConfig(): Extract<ApiEnvironment['googleOAuth'], { enabled: true }> {
    const googleOAuth = this.configService.get('googleOAuth', { infer: true });
    if (!googleOAuth.enabled) {
      throw new Error('Google OAuth is disabled.');
    }
    return googleOAuth;
  }
}
