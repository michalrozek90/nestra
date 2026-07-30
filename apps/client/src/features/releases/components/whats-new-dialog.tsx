import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Dialog, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { getResponsiveLayout } from '@/theme/breakpoints';
import { spacing, typography } from '@/theme/tokens';

const DIALOG_MAX_WIDTH_PX = 560;
const DIALOG_MAX_HEIGHT_RATIO = 0.75;

type WhatsNewDialogProps = {
  readonly children: ReactNode;
  readonly dismissLabel: string;
  readonly onDismiss: () => void;
  readonly title: string;
  readonly visible: boolean;
};

export function WhatsNewDialog({
  children,
  dismissLabel,
  onDismiss,
  title,
  visible,
}: WhatsNewDialogProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const horizontalMarginPx = Math.max(
    safeAreaInsets.left,
    safeAreaInsets.right,
    getResponsiveLayout(windowWidth) === 'compact' ? spacing.lg : spacing.xl,
  );
  const availableWidthPx = Math.max(0, windowWidth - horizontalMarginPx * 2);
  const dialogWidthPx = Math.min(DIALOG_MAX_WIDTH_PX, availableWidthPx);
  const contentMaxHeightPx = Math.max(160, windowHeight * DIALOG_MAX_HEIGHT_RATIO);

  return (
    <Portal>
      <Dialog
        dismissable
        onDismiss={onDismiss}
        style={[styles.dialog, { marginHorizontal: horizontalMarginPx, width: dialogWidthPx }]}
        visible={visible}
      >
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: contentMaxHeightPx }}>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.actions}>
          <Button label={dismissLabel} onPress={onDismiss} />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

type WhatsNewIntroProps = {
  readonly text: string;
};

export function WhatsNewIntro({ text }: WhatsNewIntroProps) {
  return <Text style={styles.intro}>{text}</Text>;
}

const styles = StyleSheet.create({
  actions: {
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  dialog: {
    alignSelf: 'center',
  },
  intro: {
    ...typography.body,
  },
});
