import { Redirect } from 'expo-router';

import { useAuth } from '@/infrastructure/auth/auth-provider';

export default function IndexScreen() {
  const { status } = useAuth();
  return <Redirect href={status === 'authenticated' ? '/notes' : '/login'} />;
}
