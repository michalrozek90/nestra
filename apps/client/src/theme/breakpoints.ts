/**
 * Compact starts at the minimum supported layout width.
 * Widths below this floor still use the compact layout; they are not a supported design target.
 */
export const BREAKPOINTS = {
  compact: 320,
  medium: 768,
  expanded: 1200,
} as const;

export const MINIMUM_SUPPORTED_LAYOUT_WIDTH = BREAKPOINTS.compact;

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
