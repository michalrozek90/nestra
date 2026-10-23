export const EXTERNAL_AUTH_TRANSACTION_PROVIDER = 'google' as const;

export type ExternalAuthTransactionIntent = 'sign_in' | 'link';
export type ExternalAuthTransactionStatus =
  | 'pending_provider'
  | 'processing_provider'
  | 'pending_handoff'
  | 'consumed'
  | 'expired'
  | 'failed';

export const PROVIDER_TRANSACTION_TTL_MS = 10 * 60 * 1000;
export const HANDOFF_TTL_MS = 2 * 60 * 1000;
export const PROCESSING_LEASE_TTL_MS = 45 * 1000;
