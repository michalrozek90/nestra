import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button as PaperButton, Text, TextInput } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Button } from '@/components/button';
import { matchesDangerZoneConfirmation } from '@/features/account/danger-zone-confirmation';
import { useDeleteAccount } from '@/features/account/use-delete-account';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { radii, spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

const VERTICAL_GRID_LINE_COUNT = 18;
const HORIZONTAL_GRID_LINE_COUNT = 10;

export function DeleteAccountSection() {
  const { t } = useTranslation('settings');
  const theme = useNestraTheme();
  const { isSigningOut } = useAuth();
  const { clearFailure, deleteAccount, failure, isDeleting } = useDeleteAccount();
  const [isConfirming, setIsConfirming] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const requiredPhrase = t('dangerZone.confirmationPhrase');
  const isConfirmationAccepted = matchesDangerZoneConfirmation(typedConfirmation, requiredPhrase);
  const panelFill = theme.dark ? 'rgba(92, 18, 22, 0.55)' : 'rgba(161, 61, 61, 0.1)';
  const gridLine = theme.dark ? 'rgba(0, 0, 0, 0.14)' : 'rgba(120, 32, 32, 0.06)';
  const phraseFill = theme.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(29, 39, 35, 0.04)';
  const panelBorder = theme.dark ? 'rgba(255, 180, 171, 0.45)' : 'rgba(161, 61, 61, 0.4)';

  function closeConfirmation(): void {
    if (isDeleting) {
      return;
    }

    setIsConfirming(false);
    setTypedConfirmation('');
    clearFailure();
  }

  function confirmDeletion(): void {
    if (!matchesDangerZoneConfirmation(typedConfirmation, requiredPhrase)) {
      return;
    }

    void deleteAccount(typedConfirmation);
  }

  return (
    <View style={[styles.panel, { backgroundColor: panelFill, borderColor: panelBorder }]}>
      <View style={[StyleSheet.absoluteFill, styles.grid]}>
        {Array.from({ length: VERTICAL_GRID_LINE_COUNT }, (_, index) => (
          <View
            key={`vertical-grid-line-${index}`}
            style={[
              styles.verticalGridLine,
              {
                backgroundColor: gridLine,
                left: `${((index + 1) / (VERTICAL_GRID_LINE_COUNT + 1)) * 100}%`,
              },
            ]}
          />
        ))}
        {Array.from({ length: HORIZONTAL_GRID_LINE_COUNT }, (_, index) => (
          <View
            key={`horizontal-grid-line-${index}`}
            style={[
              styles.horizontalGridLine,
              {
                backgroundColor: gridLine,
                top: `${((index + 1) / (HORIZONTAL_GRID_LINE_COUNT + 1)) * 100}%`,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.content}>
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
            setTypedConfirmation('');
            clearFailure();
            setIsConfirming(true);
          }}
          variant="destructive"
        />
        <ActionDialog
          description={t('dangerZone.confirmation')}
          descriptionAccessory={
            <View style={styles.confirmationFields}>
              <Text style={styles.description}>{t('dangerZone.confirmationInstruction')}</Text>
              <View
                accessibilityLabel={requiredPhrase}
                style={[
                  styles.phrase,
                  { backgroundColor: phraseFill, borderColor: theme.colors.outlineVariant },
                ]}
              >
                <View style={[styles.phraseAccent, { backgroundColor: theme.colors.error }]} />
                <Text selectable style={[styles.phraseText, { color: theme.colors.onSurface }]}>
                  {requiredPhrase}
                </Text>
              </View>
              <TextInput
                accessibilityLabel={t('dangerZone.confirmationInputLabel')}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                disabled={isDeleting}
                label={t('dangerZone.confirmationInputLabel')}
                mode="outlined"
                onChangeText={setTypedConfirmation}
                onSubmitEditing={confirmDeletion}
                value={typedConfirmation}
              />
              {failure !== null ? (
                <Text
                  accessibilityRole="alert"
                  style={[styles.error, { color: theme.colors.error }]}
                >
                  {failure === 'offline' ? t('dangerZone.offline') : t('dangerZone.failed')}
                </Text>
              ) : null}
            </View>
          }
          dismissable={!isDeleting}
          onDismiss={closeConfirmation}
          title={t('dangerZone.confirmationTitle')}
          visible={isConfirming}
        >
          <PaperButton disabled={isDeleting} onPress={closeConfirmation}>
            {t('dangerZone.cancel')}
          </PaperButton>
          <PaperButton
            disabled={!isConfirmationAccepted || isDeleting}
            loading={isDeleting}
            onPress={confirmDeletion}
            {...(isConfirmationAccepted ? { textColor: theme.colors.error } : {})}
          >
            {t('dangerZone.confirm')}
          </PaperButton>
        </ActionDialog>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    zIndex: 1,
  },
  confirmationFields: {
    gap: spacing.md,
  },
  description: {
    ...typography.supporting,
  },
  error: {
    ...typography.supporting,
    width: '100%',
  },
  grid: {
    pointerEvents: 'none',
  },
  horizontalGridLine: {
    height: 1,
    position: 'absolute',
    width: '100%',
  },
  panel: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  phrase: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  phraseAccent: {
    borderRadius: radii.pill,
    height: 18,
    opacity: 0.85,
    width: 3,
  },
  phraseText: {
    ...typography.settingsTitle,
  },
  title: {
    ...typography.sectionTitle,
    textTransform: 'uppercase',
  },
  verticalGridLine: {
    height: '100%',
    position: 'absolute',
    width: 1,
  },
});
