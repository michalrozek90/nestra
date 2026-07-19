import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  type Theme as NavigationTheme,
} from 'expo-router';
import { MD3DarkTheme, MD3LightTheme, useTheme, type MD3Theme } from 'react-native-paper';

import { darkColorScheme, lightColorScheme } from './colors';

export const nestraLightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColorScheme,
  },
};

export const nestraDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColorScheme,
  },
};

export const nestraLightNavigationTheme: NavigationTheme = {
  ...NavigationLightTheme,
  colors: {
    ...NavigationLightTheme.colors,
    primary: lightColorScheme.primary,
    background: lightColorScheme.background,
    card: lightColorScheme.surface,
    text: lightColorScheme.onSurface,
    border: lightColorScheme.outlineVariant,
    notification: lightColorScheme.error,
  },
};

export const nestraDarkNavigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkColorScheme.primary,
    background: darkColorScheme.background,
    card: darkColorScheme.surface,
    text: darkColorScheme.onSurface,
    border: darkColorScheme.outlineVariant,
    notification: darkColorScheme.error,
  },
};

export function useNestraTheme(): MD3Theme {
  return useTheme<MD3Theme>();
}
