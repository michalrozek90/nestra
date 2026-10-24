import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { Header } from '@/components/header';
import { Screen } from '@/components/screen';
import { runtimeConfig } from '@/config/runtime-config';
import { ReleaseNotesHistory } from '@/features/releases/components/release-notes-history';
import { getReleaseNotesNewestFirst } from '@/features/releases/release-notes';
import { spacing } from '@/theme/tokens';

export default function WhatsNewHistoryScreen() {
  const { t } = useTranslation('releases');
  const router = useRouter();
  const releaseNotes = getReleaseNotesNewestFirst(runtimeConfig.applicationVersion);

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel={t('whatsNew.actions.back')}
          icon="arrow-left"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace('/settings');
          }}
        />
        <View style={styles.titleContainer}>
          <Header title={t('whatsNew.title')} />
        </View>
      </View>
      <ReleaseNotesHistory releaseNotes={releaseNotes} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: -spacing.sm,
  },
});
