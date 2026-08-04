import type { GoogleAuthPlatform, LoginRequest } from '@nestra/contracts';

export type GoogleAuthIntent = 'sign-in' | 'link';

export type PendingExternalAuth = {
  readonly intent: GoogleAuthIntent;
  readonly platform: GoogleAuthPlatform;
  readonly transactionId: string;
  readonly handoffVerifier: string;
  readonly transactionExpiresAt: string;
};

export type ExternalAuthBrowserResult =
  | { readonly type: 'callback'; readonly callbackUrl: string }
  | { readonly type: 'cancelled' }
  | { readonly type: 'opened' };

export interface ExternalAuthBrowser {
  prepareAuthorization(): void;
  openAuthorization(
    authorizationUrl: string,
    returnUri: string,
  ): Promise<ExternalAuthBrowserResult>;
  dismissPreparedAuthorization(): void;
}

export interface ExternalAuthCallbackSource {
  getInitialCallbackUrl(): Promise<string | null>;
  subscribe(listener: (callbackUrl: string) => void): Promise<() => void>;
}

export interface PendingExternalAuthStorage {
  read(): Promise<PendingExternalAuth | null>;
  write(pendingAuth: PendingExternalAuth): Promise<void>;
  clear(): Promise<void>;
}

export type GoogleAuthErrorKey =
  | 'errors.google.provider'
  | 'errors.google.network'
  | 'errors.google.invalidCallback'
  | 'errors.google.expiredHandoff'
  | 'errors.google.usedHandoff'
  | 'errors.google.emailUnverified'
  | 'errors.google.emailMismatch'
  | 'errors.google.identityConflict'
  | 'errors.google.unavailable'
  | 'errors.sessionStorageUnavailable'
  | 'errors.invalidCredentials'
  | 'errors.unexpected';

export type GoogleAuthState =
  | { readonly status: 'idle' }
  | { readonly status: 'pending'; readonly intent: GoogleAuthIntent }
  | { readonly status: 'link-required'; readonly errorKey?: GoogleAuthErrorKey }
  | {
      readonly status: 'feedback';
      readonly messageKey:
        GoogleAuthErrorKey | 'google.feedback.linked' | 'google.feedback.linkCancelled';
      readonly tone: 'error' | 'success' | 'neutral';
    };

export type GoogleLinkConfirmation = LoginRequest;
