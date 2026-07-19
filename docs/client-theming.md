# Client theming

Nestra uses React Native Paper Material Design 3 themes as the semantic color API for the client.
The application supports `system`, `light`, and `dark` appearance preferences.

## Structure

- `apps/client/src/theme/colors.ts` defines the complete light and dark Material Design 3 color
  schemes, including `primary`, `secondary`, surfaces, outlines, errors, and matching `on*` roles.
- `apps/client/src/theme/themes.ts` combines those schemes with Paper's built-in MD3 themes and
  maps the required roles to Expo Router and React Navigation.
- `apps/client/src/theme/tokens.ts` contains non-color design tokens such as spacing, radii, sizes,
  and product typography.
- `apps/client/src/theme/appearance-provider.tsx` resolves and applies the selected appearance to
  Paper, navigation, the status bar, and the native root surface.
- `apps/client/src/theme/system-appearance.ts` and its `.web.ts` variant isolate native and Web
  system-appearance behavior.

Expo needs a light root background before the JavaScript theme loads. `app.config.ts` therefore
contains one local bootstrap color constant with a comment linking it to
`lightColorScheme.background`. This small duplication avoids an extra cross-runtime file or a
dependency used only to import TypeScript into the Expo configuration.

The Web adapter subscribes directly to `prefers-color-scheme` because live browser appearance
changes must update immediately. Native uses React Native's `useColorScheme` and `Appearance` APIs.

## Usage rules

1. Use Paper components directly when no Nestra-specific composition or behavior is needed. Paper
   components receive the active theme automatically from `PaperProvider`.
2. For React Native views, icons, or explicit style properties, read semantic roles through
   `useNestraTheme()` and `theme.colors`. Do not import raw schemes from `colors.ts` into screens or
   components.
3. Use a role that describes purpose rather than a visual value. For example, use `primary` for a
   primary action, `surface` for a card-like background, and `onSurfaceVariant` for supporting
   text.
4. Use the matching `on*` role for content placed on a colored role, such as `onPrimary` on
   `primary` or `onErrorContainer` on `errorContainer`.
5. Add or change application colors in both light and dark schemes. Check contrast in both modes.
6. Keep spacing, radii, sizes, and product typography in `tokens.ts`; do not add them to the Paper
   color theme.

## Examples

Paper components usually need no explicit colors:

```tsx
import { Button } from 'react-native-paper';

export function SaveButton({ onPress }: { readonly onPress: () => void }) {
  return (
    <Button mode="contained" onPress={onPress}>
      Save
    </Button>
  );
}
```

Use the active semantic theme when styling a React Native primitive:

```tsx
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { spacing } from '@/theme/tokens';
import { useNestraTheme } from '@/theme/themes';

export function SupportingMessage({ message }: { readonly message: string }) {
  const theme = useNestraTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
});
```

## References

- [React Native Paper theming](https://callstack.github.io/react-native-paper/docs/guides/theming/)
- [React Native Paper with React Navigation](https://callstack.github.io/react-native-paper/docs/guides/theming-with-react-navigation)
- [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/)
- [React Navigation themes](https://reactnavigation.org/docs/themes/)
