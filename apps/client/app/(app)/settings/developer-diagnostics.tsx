import { applicationMetadata } from '@nestra/contracts';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { runtimeConfig } from '@/config/runtime-config';
import { getSelectedLanguage } from '@/i18n/i18n';
import { getDetectedSystemLanguage } from '@/i18n/system-language';
import { useApiDiagnostics } from '@/infrastructure/diagnostics/api-diagnostics';
import { getPreferenceStorageAvailability } from '@/infrastructure/storage/preference-storage';
import { spacing, typography } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';
import { useAuth } from '@/infrastructure/auth/auth-provider';
import { authStorageImplementation } from '@/infrastructure/auth/auth-token-storage';
import { getAuthenticationTokenPresence } from '@/infrastructure/auth/auth-token-presence';

type DiagnosticRowProps = {
  readonly label: string;
  readonly value: string;
};

function DiagnosticRow({ label, value }: DiagnosticRowProps) {
  const theme = useNestraTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text selectable style={[styles.value, { color: theme.colors.onSurface }]}>
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
  const { status } = useAuth();
  const tokenPresenceQuery = useQuery({
    queryKey: ['diagnostics', 'authentication-token-presence'],
    queryFn: getAuthenticationTokenPresence,
  });
  const notAvailable = t('diagnostics.values.notAvailable');
  const formatBoolean = (booleanValue: boolean | undefined) =>
    booleanValue === undefined
      ? notAvailable
      : booleanValue
        ? t('diagnostics.values.yes')
        : t('diagnostics.values.no');

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
        <SectionHeader title={t('diagnostics.sections.authentication')} />
        <Card>
          <DiagnosticRow
            label={t('diagnostics.labels.authenticated')}
            value={formatBoolean(status === 'authenticated')}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.accessTokenPresent')}
            value={formatBoolean(tokenPresenceQuery.data?.hasAccessToken)}
          />
          <DiagnosticRow
            label={t('diagnostics.labels.refreshTokenPresent')}
            value={formatBoolean(tokenPresenceQuery.data?.hasRefreshToken)}
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
            label={t('diagnostics.labels.authStorage')}
            value={authStorageImplementation}
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
    ...typography.supporting,
    flex: 1,
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
    ...typography.supporting,
    flex: 1,
    fontWeight: '600',
    textAlign: 'right',
  },
});
