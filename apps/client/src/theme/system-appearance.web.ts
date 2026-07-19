import { useSyncExternalStore } from 'react';

import type { AppearancePreference, ResolvedAppearance } from './appearance-preference';

const DARK_APPEARANCE_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemAppearance(onAppearanceChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DARK_APPEARANCE_QUERY);
  mediaQuery.addEventListener('change', onAppearanceChange);

  return () => mediaQuery.removeEventListener('change', onAppearanceChange);
}

function getSystemAppearance(): ResolvedAppearance {
  return typeof window !== 'undefined' && window.matchMedia(DARK_APPEARANCE_QUERY).matches
    ? 'dark'
    : 'light';
}

function getServerAppearance(): ResolvedAppearance {
  return 'light';
}

export function useSystemAppearance(): ResolvedAppearance {
  return useSyncExternalStore(
    subscribeToSystemAppearance,
    getSystemAppearance,
    getServerAppearance,
  );
}

export function synchronizeSystemAppearance(preference: AppearancePreference): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.colorScheme = preference === 'system' ? 'light dark' : preference;
}
