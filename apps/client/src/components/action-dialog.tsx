import type { PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing } from '@/theme/tokens';

const DIALOG_MAX_WIDTH_PX = 560;

type ActionDialogProps = PropsWithChildren<{
  readonly description: string;
  readonly dismissable?: boolean;
  readonly onDismiss?: () => void;
  readonly title: string;
  readonly visible: boolean;
}>;

export function ActionDialog({
  children,
  description,
  dismissable = true,
  onDismiss,
  title,
  visible,
}: ActionDialogProps) {
  const { width: windowWidth } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const horizontalMarginPx = Math.max(
    safeAreaInsets.left,
    safeAreaInsets.right,
    getResponsiveLayout(windowWidth) === 'compact' ? spacing.lg : spacing.xl,
  );
  const availableWidthPx = Math.max(0, windowWidth - horizontalMarginPx * 2);
  const dialogWidthPx = Math.min(DIALOG_MAX_WIDTH_PX, availableWidthPx);

  return (
    <Portal>
      <Dialog
        dismissable={dismissable}
        {...(onDismiss ? { onDismiss } : {})}
        style={[styles.dialog, { marginHorizontal: horizontalMarginPx, width: dialogWidthPx }]}
        visible={visible}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{description}</Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>{children}</Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  dialog: {
    alignSelf: 'center',
  },
});
