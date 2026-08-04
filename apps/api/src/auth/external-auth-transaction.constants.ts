export const EXTERNAL_AUTH_TRANSACTION_PROVIDER = 'google' as const;
export const EXTERNAL_AUTH_TRANSACTION_INTENTS = ['sign_in', 'link'] as const;
export const EXTERNAL_AUTH_TRANSACTION_STATUSES = [
  'pending_provider',
  'processing_provider',
  'pending_handoff',
  'consumed',
  'expired',
  'failed',
] as const;

export type ExternalAuthTransactionIntent = (typeof EXTERNAL_AUTH_TRANSACTION_INTENTS)[number];
export type ExternalAuthTransactionStatus = (typeof EXTERNAL_AUTH_TRANSACTION_STATUSES)[number];

export const PROVIDER_TRANSACTION_TTL_MS = 10 * 60 * 1000;
export const HANDOFF_TTL_MS = 2 * 60 * 1000;
export const PROCESSING_LEASE_TTL_MS = 45 * 1000;
