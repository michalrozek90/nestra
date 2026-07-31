import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ProgressBar } from 'react-native-paper';

import { ActionDialog } from '@/components/action-dialog';
import { Button } from '@/components/button';
import { useApplicationUpdate } from './application-update-provider';
import type { ApplicationUpdateState } from './application-update.types';

function getDescription(state: ApplicationUpdateState, t: TFunction<'releases'>): string {
  switch (state.status) {
    case 'available':
      return state.notes
        ? t('update.availableWithNotes', { version: state.version, notes: state.notes })
        : t('update.available', { version: state.version });
    case 'downloading': {
      const progressPercent = state.totalBytes
        ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100))
        : undefined;
      return progressPercent === undefined
        ? t('update.downloading')
        : t('update.downloadingProgress', { progressPercent });
    }
    case 'installing':
      return t('update.installing');
    case 'restart-required':
      return t('update.restartRequired');
    case 'recoverable-error':
      return t(`update.errors.${state.code}`);
    case 'unsupported':
    case 'idle':
    case 'checking':
    case 'up-to-date':
      return '';
  }
}

export function ApplicationUpdateHost() {
  const { t } = useTranslation('releases');
  const { state, isPromptVisible, dismissPrompt, dismissError, installAvailableUpdate } =
    useApplicationUpdate();
  const isVisible =
    isPromptVisible &&
    (state.status === 'available' ||
      state.status === 'downloading' ||
      state.status === 'installing' ||
      state.status === 'restart-required' ||
      state.status === 'recoverable-error');
  const isBusy = state.status === 'downloading' || state.status === 'installing';
  const downloadProgress =
    state.status === 'downloading' && state.totalBytes
      ? Math.min(1, state.downloadedBytes / state.totalBytes)
      : undefined;

  return (
    <ActionDialog
      description={getDescription(state, t)}
      descriptionAccessory={
        state.status === 'downloading' ? (
          <ProgressBar
            accessibilityLabel={t('update.downloadProgressAccessibilityLabel')}
            indeterminate={downloadProgress === undefined}
            {...(downloadProgress === undefined ? {} : { progress: downloadProgress })}
          />
        ) : undefined
      }
      dismissable={!isBusy}
      onDismiss={state.status === 'recoverable-error' ? dismissError : dismissPrompt}
      title={t('update.title')}
      visible={isVisible}
    >
      {state.status === 'available' ? (
        <>
          <Button label={t('update.actions.later')} onPress={dismissPrompt} variant="secondary" />
          <Button
            label={t('update.actions.install')}
            onPress={() => void installAvailableUpdate()}
          />
        </>
      ) : null}
      {state.status === 'restart-required' ? (
        <Button label={t('update.actions.restart')} onPress={() => void installAvailableUpdate()} />
      ) : null}
      {state.status === 'recoverable-error' ? (
        <>
          <Button label={t('update.actions.close')} onPress={dismissError} variant="secondary" />
          {state.version ? (
            <Button
              label={t('update.actions.retry')}
              onPress={() => void installAvailableUpdate()}
            />
          ) : null}
        </>
      ) : null}
    </ActionDialog>
  );
}
