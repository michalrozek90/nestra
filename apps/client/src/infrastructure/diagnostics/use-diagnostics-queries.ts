import { useQuery } from '@tanstack/react-query';

import { getApiHealth } from '@/infrastructure/api/api-health';

export const diagnosticsQueryKeys = {
  apiHealth: ['diagnostics', 'api-health'] as const,
  draftStorageAvailability: ['diagnostics', 'draft-storage-availability'] as const,
  authenticationTokenPresence: ['diagnostics', 'authentication-token-presence'] as const,
} as const;

export function useApiHealthQuery() {
  return useQuery({
    queryKey: diagnosticsQueryKeys.apiHealth,
    queryFn: getApiHealth,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
  });
}
