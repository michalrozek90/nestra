import { StyleSheet } from 'react-native';

import { Loader } from '@/components/loader';
import { Screen } from '@/components/screen';

const LOADER_SIZE_PX = 88;

type LoadingScreenProps = {
  readonly accessibilityLabel: string;
};

export function LoadingScreen({ accessibilityLabel }: LoadingScreenProps) {
  return (
    <Screen contentStyle={styles.content} isScrollable={false}>
      <Loader accessibilityLabel={accessibilityLabel} size={LOADER_SIZE_PX} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
