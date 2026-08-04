import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import { parseApiEnvironment } from '../config/api-environment';
import {
  createExternalAuthRandomValue,
  createPkceChallenge,
  hashExternalAuthValue,
} from './external-auth-transaction.crypto';
import { GoogleOAuthVerificationError } from './google-oauth.errors';

function baseEnvironment(
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    API_HOST: '0.0.0.0',
    API_PORT: '3000',
    DATABASE_URL: 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra',
    JWT_ACCESS_SECRET: 'replace_with_a_long_random_secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    REFRESH_SESSION_EXPIRES_IN: '30d',
    CORS_ALLOWED_ORIGINS: 'http://localhost:8081',
    ...overrides,
  };
}

describe('Google OAuth environment and protocol helpers', () => {
  it('keeps Google OAuth disabled when the flag is absent or false', () => {
    assert.equal(parseApiEnvironment(baseEnvironment()).googleOAuth.enabled, false);
    assert.equal(
      parseApiEnvironment(baseEnvironment({ GOOGLE_OAUTH_ENABLED: 'false' })).googleOAuth.enabled,
      false,
    );
  });

  it('fails closed when Google OAuth is enabled without complete configuration', () => {
    assert.throws(
      () => parseApiEnvironment(baseEnvironment({ GOOGLE_OAUTH_ENABLED: 'true' })),
      /Invalid API environment configuration/,
    );
  });

  it('accepts a complete Google OAuth configuration', () => {
    const encryptionKey = randomBytes(32).toString('base64');
    const environment = parseApiEnvironment(
      baseEnvironment({
        GOOGLE_OAUTH_ENABLED: 'true',
        GOOGLE_OAUTH_CLIENT_ID: 'client-id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
        GOOGLE_OAUTH_CALLBACK_URI: 'http://localhost:3000/api/v1/auth/google/callback',
        GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY: encryptionKey,
        GOOGLE_OAUTH_WEB_RETURN_URI: 'http://localhost:8081/auth/google/callback',
        GOOGLE_OAUTH_ANDROID_RETURN_URI: 'com.michalrozek.nestra:/oauth/google',
        GOOGLE_OAUTH_IOS_RETURN_URI: 'com.michalrozek.nestra:/oauth/google',
        GOOGLE_OAUTH_DESKTOP_RETURN_URI: 'com.michalrozek.nestra.desktop:/oauth/google',
      }),
    );

    assert.equal(environment.googleOAuth.enabled, true);
    if (!environment.googleOAuth.enabled) {
      assert.fail('expected enabled Google OAuth configuration');
    }
    assert.equal(environment.googleOAuth.clientId, 'client-id');
    assert.equal(
      environment.googleOAuth.returnUris.desktop,
      'com.michalrozek.nestra.desktop:/oauth/google',
    );
    assert.equal(environment.googleOAuth.transactionEncryptionKey.length, 32);
  });

  it('rejects Google encryption keys that are not exactly 32 bytes', () => {
    assert.throws(
      () =>
        parseApiEnvironment(
          baseEnvironment({
            GOOGLE_OAUTH_ENABLED: 'true',
            GOOGLE_OAUTH_CLIENT_ID: 'client-id',
            GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
            GOOGLE_OAUTH_CALLBACK_URI: 'http://localhost:3000/api/v1/auth/google/callback',
            GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY: randomBytes(16).toString('base64'),
            GOOGLE_OAUTH_WEB_RETURN_URI: 'http://localhost:8081/auth/google/callback',
            GOOGLE_OAUTH_ANDROID_RETURN_URI: 'com.michalrozek.nestra:/oauth/google',
            GOOGLE_OAUTH_IOS_RETURN_URI: 'com.michalrozek.nestra:/oauth/google',
            GOOGLE_OAUTH_DESKTOP_RETURN_URI: 'com.michalrozek.nestra.desktop:/oauth/google',
          }),
        ),
      /GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY/,
    );
  });

  it('binds handoff codes to hashed secrets and PKCE challenges', () => {
    const transactionId = '11111111-1111-4111-8111-111111111111';
    const secret = createExternalAuthRandomValue();
    const handoffCode = `${transactionId}.${secret}`;
    const verifier = createExternalAuthRandomValue();

    assert.equal(hashExternalAuthValue(handoffCode).length, 64);
    assert.notEqual(
      hashExternalAuthValue(handoffCode),
      hashExternalAuthValue(`${transactionId}.other`),
    );
    assert.equal(createPkceChallenge(verifier).length, 43);
  });

  it('classifies Google verification failures without exposing claims', () => {
    const unverified = new GoogleOAuthVerificationError('unverified_email');
    assert.equal(unverified.reason, 'unverified_email');
    assert.match(unverified.message, /unverified_email/);
    assert.doesNotMatch(unverified.message, /@/);
  });
});
