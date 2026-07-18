export const BREAKPOINTS = {
  compact: 0,
  medium: 768,
  expanded: 1200,
} as const;

export type ResponsiveLayout = keyof typeof BREAKPOINTS;

export function getResponsiveLayout(windowWidth: number): ResponsiveLayout {
  if (windowWidth >= BREAKPOINTS.expanded) {
    return 'expanded';
  }

  if (windowWidth >= BREAKPOINTS.medium) {
    return 'medium';
  }

  return 'compact';
}
