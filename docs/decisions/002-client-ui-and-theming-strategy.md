# 002 — Client UI and theming strategy

## Status

Accepted

## Context

The initial client foundation used React Native `StyleSheet`, a small token object, and a limited
set of custom primitives. Authentication, Notes, and the remaining Settings work will introduce
forms, dialogs, feedback states, menus, list actions, and other interactive components. Building
all of those controls from scratch would increase accessibility, interaction, and maintenance risk.

Nestra also needs dark mode before feature UI expands. The client targets Android, iOS, and Web
through Expo, with the Web output remaining suitable for a future Tauri wrapper. The chosen
solution must therefore support the existing universal navigation tree and all three current
platforms without introducing a web-only styling model.

## Decision

Nestra will use React Native Paper `5.15.3`, the latest stable release verified during Stage 4, as
its UI component foundation. Its peer requirements accept the project's React `19.2.3`, React
Native `0.86.0`, and `react-native-safe-area-context` `5.7.0`. A prerelease major version must not
be installed. Expo-managed native appearance integration uses the Expo SDK 57-compatible
`expo-system-ui` `57.0.1` release.

The application will own customized Material Design 3 light and dark themes, semantic design
tokens, and reusable product-specific components. The appearance preference will support
`system`, `light`, and `dark`, default to `system`, react to system changes in that mode, and persist
manual selection with AsyncStorage.

The resolved appearance will be applied consistently to React Native Paper, Expo Router/React
Navigation, status bars, navigation surfaces, and native system UI. Expo uses automatic system
appearance, React Native's application-level appearance override for manual selections, and
`expo-system-ui` for the native root surface background.

React Native Paper primitives may be used directly when no Nestra-specific abstraction is useful.
Application components will encapsulate reusable product semantics or composed behavior; the
project will not create one-to-one wrappers for the entire Paper API. React Native `StyleSheet` and
native layout APIs remain available for layout and platform-specific styling that Paper does not
replace.

## Consequences

- Common interactive controls, theming behavior, and accessibility foundations do not need to be
  rebuilt from scratch.
- Dark mode and navigation theming have one application-owned source of truth.
- Nestra retains control of its colors, typography, spacing, and product-specific components while
  accepting Material Design 3 as the base component model.
- The client gains a runtime dependency and some coupling to the React Native Paper theme and
  component APIs.
- Future Paper upgrades require compatibility checks and visual regression review on Android, iOS,
  and Web.

## Alternatives considered

- Continue with only custom `StyleSheet` components: maximum visual control, but unnecessary cost
  and risk for accessible inputs, dialogs, menus, and feedback components.
- Tamagui: a capable universal styling and component system, but it introduces a larger new mental
  model and more bundler and monorepo configuration than the current product requires.
- NativeWind with custom components: familiar utility-first styling, but it is a styling layer, not
  a complete component library, so the project would still own the difficult interactive controls.
- gluestack-ui: broad component coverage, but its current direction adds a Tailwind-compatible
  styling layer and greater tooling churn than is justified for the initial release.
