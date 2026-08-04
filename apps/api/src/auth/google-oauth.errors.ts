export type GoogleOAuthVerificationFailureReason =
  'exchange_failed' | 'invalid_claims' | 'unverified_email';

export class GoogleOAuthVerificationError extends Error {
  constructor(readonly reason: GoogleOAuthVerificationFailureReason) {
    super(`Google OAuth verification failed: ${reason}`);
    this.name = 'GoogleOAuthVerificationError';
  }
}
