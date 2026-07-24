import { useTranslation } from 'react-i18next';
import { Button, Dialog, Portal, Text } from 'react-native-paper';

import { useNestraTheme } from '@/theme/themes';

type ConfirmationDialogProps = {
  readonly isVisible: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly isConfirming?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
};

export function ConfirmationDialog({
  isVisible,
  title,
  description,
  confirmLabel,
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const { t } = useTranslation('notes');
  const theme = useNestraTheme();

  return (
    <Portal>
      <Dialog dismissable={!isConfirming} onDismiss={onCancel} visible={isVisible}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{description}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={isConfirming} onPress={onCancel}>
            {t('actions.cancel')}
          </Button>
          <Button loading={isConfirming} onPress={onConfirm} textColor={theme.colors.error}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
