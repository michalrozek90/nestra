import { googleAuthExchangeRequestSchema } from '@nestra/contracts';

import type { PendingExternalAuth } from './google-auth.types';

export class InvalidGoogleAuthCallbackError extends Error {
  public constructor() {
    super('Google authentication callback is invalid.');
    this.name = 'InvalidGoogleAuthCallbackError';
  }
}

export class ExpiredGoogleAuthCallbackError extends Error {
  public constructor() {
    super('Google authentication callback has expired.');
    this.name = 'ExpiredGoogleAuthCallbackError';
  }
}

function hasExactCallbackLocation(callbackUrl: URL, returnUri: URL): boolean {
  return (
    callbackUrl.protocol === returnUri.protocol &&
    callbackUrl.host === returnUri.host &&
    callbackUrl.pathname === returnUri.pathname &&
    callbackUrl.username.length === 0 &&
    callbackUrl.password.length === 0 &&
    callbackUrl.hash.length === 0
  );
}

export function isGoogleAuthCallbackUrl(callbackUrl: string, returnUri: string): boolean {
  try {
    return hasExactCallbackLocation(new URL(callbackUrl), new URL(returnUri));
  } catch {
    return false;
  }
}

export function readGoogleHandoffCode(
  callbackUrlText: string,
  returnUriText: string,
  pendingAuth: PendingExternalAuth,
  currentTimestampMs: number,
): string {
  const callbackUrl = new URL(callbackUrlText);
  const returnUri = new URL(returnUriText);
  if (!hasExactCallbackLocation(callbackUrl, returnUri)) {
    throw new InvalidGoogleAuthCallbackError();
  }

  const queryKeys = [...callbackUrl.searchParams.keys()];
  const handoffCode = callbackUrl.searchParams.get('handoff');
  if (queryKeys.length !== 1 || queryKeys[0] !== 'handoff' || !handoffCode) {
    throw new InvalidGoogleAuthCallbackError();
  }

  if (Date.parse(pendingAuth.transactionExpiresAt) <= currentTimestampMs) {
    throw new ExpiredGoogleAuthCallbackError();
  }

  const parsedExchangeRequest = googleAuthExchangeRequestSchema.safeParse({
    handoffCode,
    handoffVerifier: pendingAuth.handoffVerifier,
  });
  if (!parsedExchangeRequest.success || !handoffCode.startsWith(`${pendingAuth.transactionId}.`)) {
    throw new InvalidGoogleAuthCallbackError();
  }

  return handoffCode;
}

export function removeGoogleCallbackFromBrowserHistory(returnUri: string): void {
  if (typeof history === 'undefined' || typeof location === 'undefined') {
    return;
  }

  const expectedReturnUri = new URL(returnUri);
  if (location.pathname === expectedReturnUri.pathname) {
    history.replaceState({}, '', '/login');
  }
}
