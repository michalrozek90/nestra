import { describe, expect, it } from 'vitest';

import { isSafeGoogleAuthMobileReturnUri } from '../../app.config';

describe('Google authentication mobile return URI', () => {
  it('accepts only the application scheme in development', () => {
    expect(
      isSafeGoogleAuthMobileReturnUri('com.michalrozek.nestra:/oauth/google', 'development'),
    ).toBe(true);
    expect(
      isSafeGoogleAuthMobileReturnUri('https://app.example.com/oauth/google', 'development'),
    ).toBe(false);
  });

  it('accepts an exact public HTTPS URI outside development', () => {
    expect(isSafeGoogleAuthMobileReturnUri('https://app.example.com/oauth/google', 'preview')).toBe(
      true,
    );
    expect(
      isSafeGoogleAuthMobileReturnUri('https://app.example.com/oauth/google', 'production'),
    ).toBe(true);
  });

  it.each([
    'com.michalrozek.nestra:/oauth/google',
    'http://app.example.com/oauth/google',
    'https://localhost/oauth/google',
    'https://192.0.2.1/oauth/google',
    'https://app.example.com:8443/oauth/google',
    'https://app.example.com/oauth/other',
    'https://app.example.com/oauth/google?handoff=value',
    ' https://app.example.com/oauth/google',
  ])('rejects unsafe production URI %s', (returnUri) => {
    expect(isSafeGoogleAuthMobileReturnUri(returnUri, 'production')).toBe(false);
  });
});
