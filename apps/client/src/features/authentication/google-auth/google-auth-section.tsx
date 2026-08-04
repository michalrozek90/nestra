import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { GoogleAuthButton } from './google-auth-button';
import { GoogleLinkConfirmationDialog } from './google-link-confirmation-dialog';
import { useGoogleAuth } from './google-auth-provider';

type GoogleAuthSectionProps = {
  readonly mode: 'sign-in' | 'sign-up';
};

export function GoogleAuthSection({ mode }: GoogleAuthSectionProps) {
  const { t } = useTranslation('auth');
  const theme = useNestraTheme();
  const { isEnabled, state, startSignIn, confirmLink, dismissLinkConfirmation } = useGoogleAuth();

  if (!isEnabled) {
    return null;
  }

  const isPending = state.status === 'pending';
  const errorMessage =
    state.status === 'feedback' && state.tone === 'error' ? t(state.messageKey) : null;

  return (
    <>
      <View accessibilityRole="none" style={styles.dividerRow}>
        <Divider style={styles.divider} />
        <Text style={[styles.orLabel, { color: theme.colors.onSurfaceVariant }]}>
          {t('google.or')}
        </Text>
        <Divider style={styles.divider} />
      </View>
      <GoogleAuthButton
        accessibilityLabel={t(`google.${mode}.accessibilityLabel`)}
        isDisabled={false}
        isLoading={isPending}
        label={t(`google.${mode}.label`)}
        onPress={() => void startSignIn()}
      />
      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
          {errorMessage}
        </Text>
      ) : null}
      <GoogleLinkConfirmationDialog
        {...(state.status === 'link-required' && state.errorKey
          ? { errorKey: state.errorKey }
          : {})}
        isVisible={state.status === 'link-required'}
        onCancel={dismissLinkConfirmation}
        onConfirm={confirmLink}
      />
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    flex: 1,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    ...typography.supporting,
  },
  orLabel: {
    ...typography.supporting,
  },
});
