import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
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
    <ActionDialog
      description={description}
      dismissable={!isConfirming}
      onDismiss={onCancel}
      title={title}
      visible={isVisible}
    >
      <Button disabled={isConfirming} onPress={onCancel}>
        {t('actions.cancel')}
      </Button>
      <Button loading={isConfirming} onPress={onConfirm} textColor={theme.colors.error}>
        {confirmLabel}
      </Button>
    </ActionDialog>
  );
}
