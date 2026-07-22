import { Redirect, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNestraTheme } from '@/theme/themes';
import { useAuth } from '@/infrastructure/auth/auth-provider';

export default function AuthenticationLayout() {
  const theme = useNestraTheme();
  const { status } = useAuth();

  if (status === 'authenticated') {
    return <Redirect href="/notes" />;
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
