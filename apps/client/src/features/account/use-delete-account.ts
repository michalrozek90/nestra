import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  classifyAccountDeletionFailure,
  type AccountDeletionFailure,
} from '@/features/account/classify-account-deletion-failure';
import { matchesDangerZoneConfirmation } from '@/features/account/danger-zone-confirmation';
import { noteDraftStorage } from '@/features/notes/drafts/note-draft-storage';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';

export function useDeleteAccount(): {
  readonly failure: AccountDeletionFailure | null;
  readonly isDeleting: boolean;
  readonly clearFailure: () => void;
  readonly deleteAccount: (typedConfirmation: string) => Promise<void>;
} {
  const router = useRouter();
  const { t } = useTranslation('settings');
  const { deleteAccount: deleteAuthenticatedAccount, user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<AccountDeletionFailure | null>(null);
  const isDeletingRef = useRef(false);

  async function deleteAccount(typedConfirmation: string): Promise<void> {
    if (
      isDeletingRef.current ||
      !matchesDangerZoneConfirmation(typedConfirmation, t('dangerZone.confirmationPhrase'))
    ) {
      return;
    }

    const userId = user?.id;
    isDeletingRef.current = true;
    setIsDeleting(true);
    setFailure(null);

    try {
      await deleteAuthenticatedAccount();

      if (userId !== undefined) {
        try {
          await noteDraftStorage.clearForUser(userId);
        } catch (error: unknown) {
          logger.error('Note drafts could not be cleared after account deletion', error);
        }
      }

      router.replace('/login');
    } catch (error: unknown) {
      logger.error('Account deletion failed', error);
      setFailure(classifyAccountDeletionFailure(error));
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }

  return {
    failure,
    isDeleting,
    clearFailure: () => setFailure(null),
    deleteAccount,
  };
}
