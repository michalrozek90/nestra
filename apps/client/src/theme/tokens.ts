export const colors = {
  background: '#f7f6f2',
  surface: '#ffffff',
  surfaceMuted: '#edf1ee',
  primary: '#2f6652',
  primaryPressed: '#244f40',
  primarySoft: '#dcebe4',
  textPrimary: '#1d2723',
  textSecondary: '#5c6963',
  textOnPrimary: '#ffffff',
  border: '#d5ddd8',
  danger: '#a13d3d',
  focus: '#397d64',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const sizes = {
  minimumTouchTarget: 48,
  navigationRailWidth: 88,
  navigationSidebarWidth: 248,
} as const;
