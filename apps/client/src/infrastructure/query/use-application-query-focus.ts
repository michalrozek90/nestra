import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export function useApplicationQueryFocus(): void {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const updateFocus = (appState: AppStateStatus) => {
      focusManager.setFocused(appState === 'active');
    };

    updateFocus(AppState.currentState);
    const subscription = AppState.addEventListener('change', updateFocus);
    return () => subscription.remove();
  }, []);
}
