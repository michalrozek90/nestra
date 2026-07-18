import { applicationMetadata } from '@nestra/contracts';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { runtimeConfig } from '@/config/runtime-config';
import { getSelectedLanguage } from '@/i18n/i18n';
import { getDetectedSystemLanguage } from '@/i18n/system-language';
import { useApiDiagnostics } from '@/infrastructure/diagnostics/api-diagnostics';
import { getPreferenceStorageAvailability } from '@/infrastructure/storage/preference-storage';
import { colors, spacing } from '@/theme/tokens';

type DiagnosticRowProps = {
  readonly label: string;
  readonly value: string;
};

function DiagnosticRow({ label, value }: DiagnosticRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

function formatTimestamp(timestamp: string | null, fallback: string): string {
  return timestamp ? new Date(timestamp).toLocaleString() : fallback;
}

export default function DeveloperDiagnosticsScreen() {
  const { t } = useTranslation('settings');
  const apiDiagnostics = useApiDiagnostics();
  const notAvailable = t('diagnostics.values.notAvailable');

  if (!runtimeConfig.showDeveloperDiagnostics) {
    return <Redirect href="/settings" />;
  }

  return (
    <Screen>
      <Header title={t('diagnostics.title')} />

      <View style={styles.section}>
        <SectionHeader title={t('diagnostics.sections.application')} />
        <Card>
          <DiagnosticRow label={t('diagnostics.labels.name')} value={applicationMetadata.name} />
          <DiagnosticRow
            label={t('diagnostics.labels.version')}
            value={runtimeConfig.applicationVersion}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.environment')}
            value={runtimeConfig.environment}
          />
          <DiagnosticRow label={t('diagnostics.labels.platform')} value={Platform.OS} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('diagnostics.sections.api')} />
        <Card>
          <DiagnosticRow
            label={t('diagnostics.labels.apiBaseUrl')}
            value={runtimeConfig.apiBaseUrl}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.lastSuccessfulRequest')}
            value={formatTimestamp(apiDiagnostics.lastSuccessfulRequestAt, notAvailable)}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.lastFailedRequest')}
            value={formatTimestamp(apiDiagnostics.lastFailedRequestAt, notAvailable)}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.lastErrorCode')}
            value={apiDiagnostics.lastErrorCode ?? notAvailable}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.lastRequestId')}
            value={apiDiagnostics.lastRequestId ?? notAvailable}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('diagnostics.sections.localization')} />
        <Card>
          <DiagnosticRow
            label={t('diagnostics.labels.selectedLanguage')}
            value={getSelectedLanguage()}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.detectedLanguage')}
            value={getDetectedSystemLanguage()}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.preferenceStorage')}
            value={
              getPreferenceStorageAvailability()
                ? t('diagnostics.values.available')
                : t('diagnostics.values.unavailable')
            }
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.md,
  },
  value: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
