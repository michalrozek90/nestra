import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Button as PaperButton, Dialog, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getResponsiveLayout } from '@/theme/breakpoints';
import { radii, spacing } from '@/theme/tokens';

const DIALOG_MAX_WIDTH_PX = 560;
const DIALOG_SCROLL_MAX_HEIGHT_RATIO = 0.58;
const COMPACT_DISMISS_MIN_HEIGHT_PX = 36;

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
  const isCompact = getResponsiveLayout(windowWidth) === 'compact';
  const horizontalMarginPx = Math.max(
    safeAreaInsets.left,
    safeAreaInsets.right,
    isCompact ? spacing.md : spacing.xl,
  );
  const availableWidthPx = Math.max(0, windowWidth - horizontalMarginPx * 2);
  const dialogWidthPx = Math.min(DIALOG_MAX_WIDTH_PX, availableWidthPx);
  const contentMaxHeightPx = Math.max(160, windowHeight * DIALOG_SCROLL_MAX_HEIGHT_RATIO);
  const contentHorizontalPaddingPx = isCompact ? spacing.md : spacing.lg;

  return (
    <Portal>
      <Dialog
        dismissable
        onDismiss={onDismiss}
        style={[styles.dialog, { marginHorizontal: horizontalMarginPx, width: dialogWidthPx }]}
        visible={visible}
      >
        <Dialog.Title style={isCompact ? styles.compactTitle : undefined}>{title}</Dialog.Title>
        <Dialog.ScrollArea
          style={[
            { maxHeight: contentMaxHeightPx },
            isCompact ? styles.compactScrollArea : styles.scrollArea,
          ]}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                gap: isCompact ? spacing.md : spacing.lg,
                paddingHorizontal: contentHorizontalPaddingPx,
              },
            ]}
          >
            {children}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={[styles.actions, isCompact ? styles.compactActions : null]}>
          <PaperButton
            compact={isCompact}
            contentStyle={isCompact ? styles.compactDismissContent : styles.dismissContent}
            labelStyle={isCompact ? styles.compactDismissLabel : styles.dismissLabel}
            mode="contained"
            onPress={onDismiss}
            style={styles.dismissButton}
          >
            {dismissLabel}
          </PaperButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexWrap: 'wrap',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    rowGap: spacing.sm,
  },
  compactActions: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  compactDismissContent: {
    minHeight: COMPACT_DISMISS_MIN_HEIGHT_PX,
    paddingHorizontal: spacing.md,
  },
  compactDismissLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 0,
  },
  compactScrollArea: {
    marginBottom: spacing.sm,
    paddingHorizontal: 0,
  },
  compactTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  content: {
    paddingBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dialog: {
    alignSelf: 'center',
  },
  dismissButton: {
    borderRadius: radii.md,
  },
  dismissContent: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  dismissLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollArea: {
    marginBottom: spacing.md,
    paddingHorizontal: 0,
  },
});
