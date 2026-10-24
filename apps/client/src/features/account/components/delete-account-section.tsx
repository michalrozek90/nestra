import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button as PaperButton, Text } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Button } from '@/components/button';
import { classifyAccountDeletionFailure } from '@/features/account/classify-account-deletion-failure';
import { noteDraftStorage } from '@/features/notes/drafts/note-draft-storage';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { logger } from '@/infrastructure/logging/logger';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function DeleteAccountSection() {
  const { t } = useTranslation('settings');
  const router = useRouter();
  const theme = useNestraTheme();
  const { deleteAccount, isSigningOut, user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failure, setFailure] = useState<'offline' | 'rejected' | null>(null);
  const isDeletingRef = useRef(false);

  async function confirmDeletion(): Promise<void> {
    if (isDeletingRef.current || isSigningOut) {
      return;
    }

    const userId = user?.id;
    isDeletingRef.current = true;
    setIsDeleting(true);
    setFailure(null);

    try {
      await deleteAccount();

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

  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.title, { color: theme.colors.error }]}
      >
        {t('dangerZone.title')}
      </Text>
      <Text style={styles.description}>{t('dangerZone.description')}</Text>
      <Button
        isDisabled={isSigningOut || isDeleting}
        label={t('dangerZone.deleteAccount')}
        onPress={() => {
          setFailure(null);
          setIsConfirming(true);
        }}
        variant="destructive"
      />
      <ActionDialog
        description={t('dangerZone.confirmation')}
        dismissable={!isDeleting}
        onDismiss={() => {
          if (!isDeleting) {
            setIsConfirming(false);
            setFailure(null);
          }
        }}
        title={t('dangerZone.confirmationTitle')}
        visible={isConfirming}
      >
        {failure !== null ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
            {failure === 'offline' ? t('dangerZone.offline') : t('dangerZone.failed')}
          </Text>
        ) : null}
        <PaperButton
          disabled={isDeleting}
          onPress={() => {
            setIsConfirming(false);
            setFailure(null);
          }}
        >
          {t('dangerZone.cancel')}
        </PaperButton>
        <PaperButton
          disabled={isDeleting}
          loading={isDeleting}
          onPress={() => void confirmDeletion()}
          textColor={theme.colors.error}
        >
          {t('dangerZone.confirm')}
        </PaperButton>
      </ActionDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    ...typography.supporting,
  },
  error: {
    ...typography.supporting,
    width: '100%',
  },
  section: {
    gap: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    textTransform: 'uppercase',
  },
});
