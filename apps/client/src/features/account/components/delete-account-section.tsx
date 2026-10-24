import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button as PaperButton, Text } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Button } from '@/components/button';
import { useDeleteAccount } from '@/features/account/use-delete-account';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function DeleteAccountSection() {
  const { t } = useTranslation('settings');
  const theme = useNestraTheme();
  const { isSigningOut } = useAuth();
  const { clearFailure, deleteAccount, failure, isDeleting } = useDeleteAccount();
  const [isConfirming, setIsConfirming] = useState(false);

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
          clearFailure();
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
            clearFailure();
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
            clearFailure();
          }}
        >
          {t('dangerZone.cancel')}
        </PaperButton>
        <PaperButton
          disabled={isDeleting}
          loading={isDeleting}
          onPress={() => void deleteAccount()}
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
