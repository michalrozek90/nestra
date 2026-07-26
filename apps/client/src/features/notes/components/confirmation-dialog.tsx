import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

type ConfirmationDialogProps = {
  readonly isVisible: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly errorMessage?: string;
  readonly isConfirming?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export function ConfirmationDialog({
  isVisible,
  title,
  description,
  confirmLabel,
  errorMessage,
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();

  return (
    <ActionDialog
      description={description}
      dismissable={!isConfirming}
      onDismiss={onCancel}
      title={title}
      visible={isVisible}
    >
      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.error }]}>
          {errorMessage}
        </Text>
      ) : null}
      <Button disabled={isConfirming} onPress={onCancel}>
        {t('actions.cancel')}
      </Button>
      <Button
        disabled={isConfirming}
        loading={isConfirming}
        onPress={onConfirm}
        textColor={theme.colors.error}
      >
        {confirmLabel}
      </Button>
    </ActionDialog>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.supporting,
    width: '100%',
  },
});
