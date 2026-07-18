import { applicationMetadata } from '@nestra/contracts';
import { StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{applicationMetadata.name}</Text>
      <Text style={styles.version}>{applicationMetadata.version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f7f6f2',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#1d2723',
    fontSize: 40,
    fontWeight: '700',
  },
  version: {
    color: '#5c6963',
    fontSize: 14,
    marginTop: 8,
  },
});
