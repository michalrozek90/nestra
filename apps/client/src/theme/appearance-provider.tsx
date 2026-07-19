import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PaperProvider } from 'react-native-paper';

import { logger } from '@/infrastructure/logging/logger';
import {
  markPreferenceStorageUnavailable,
  readAppearancePreference,
  writeAppearancePreference,
} from '@/infrastructure/storage/preference-storage';
import {
  DEFAULT_APPEARANCE_PREFERENCE,
  isAppearancePreference,
  type AppearancePreference,
  type ResolvedAppearance,
} from './appearance-preference';
import {
  nestraDarkNavigationTheme,
  nestraDarkTheme,
  nestraLightNavigationTheme,
  nestraLightTheme,
} from './themes';
import { synchronizeSystemAppearance, useSystemAppearance } from './system-appearance';

type AppearanceContextValue = {
  readonly isInitialized: boolean;
  readonly preference: AppearancePreference;
  readonly resolvedAppearance: ResolvedAppearance;
  readonly changePreference: (preference: AppearancePreference) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemAppearance = useSystemAppearance();
  const [preference, setPreference] = useState<AppearancePreference>(DEFAULT_APPEARANCE_PREFERENCE);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void readAppearancePreference()
      .then((storedPreference) => {
        if (isMounted && isAppearancePreference(storedPreference)) {
          setPreference(storedPreference);
        }
      })
      .catch((error: unknown) => {
        markPreferenceStorageUnavailable('appearance');
        logger.error('Appearance preference could not be read', error);
      })
      .finally(() => {
        if (isMounted) {
          setIsInitialized(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    synchronizeSystemAppearance(preference);
  }, [preference]);

  const resolvedAppearance: ResolvedAppearance =
    preference === 'system' ? systemAppearance : preference;
  const isDark = resolvedAppearance === 'dark';
  const paperTheme = isDark ? nestraDarkTheme : nestraLightTheme;
  const navigationTheme = isDark ? nestraDarkNavigationTheme : nestraLightNavigationTheme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(paperTheme.colors.background).catch((error: unknown) => {
      logger.error('Native system background could not be synchronized', error);
    });
  }, [paperTheme]);

  const changePreference = useCallback(async (nextPreference: AppearancePreference) => {
    try {
      await writeAppearancePreference(nextPreference);
      setPreference(nextPreference);
    } catch (error: unknown) {
      markPreferenceStorageUnavailable('appearance');
      logger.error('Appearance preference could not be saved', error);
      throw error;
    }
  }, []);

  const contextValue = useMemo<AppearanceContextValue>(
    () => ({
      isInitialized,
      preference,
      resolvedAppearance,
      changePreference,
    }),
    [changePreference, isInitialized, preference, resolvedAppearance],
  );

  return (
    <AppearanceContext.Provider value={contextValue}>
      <PaperProvider theme={paperTheme}>
        <NavigationThemeProvider value={navigationTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {children}
        </NavigationThemeProvider>
      </PaperProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const contextValue = useContext(AppearanceContext);

  if (!contextValue) {
    throw new Error('useAppearance must be used within AppearanceProvider.');
  }

  return contextValue;
}
