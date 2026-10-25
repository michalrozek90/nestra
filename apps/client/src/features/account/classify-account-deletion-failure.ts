import { isAxiosError } from 'axios';

export type AccountDeletionFailure = 'offline' | 'rejected';

export function classifyAccountDeletionFailure(error: unknown): AccountDeletionFailure {
  if (isAxiosError(error) && error.response === undefined) {
    return 'offline';
  }

  return 'rejected';
}
