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

export const typography = {
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.7,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  supporting: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
} as const;
