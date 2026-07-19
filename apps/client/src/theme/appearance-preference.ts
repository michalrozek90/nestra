export const APPEARANCE_PREFERENCES = ['system', 'light', 'dark'] as const;

export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];
export type ResolvedAppearance = Exclude<AppearancePreference, 'system'>;

export const DEFAULT_APPEARANCE_PREFERENCE: AppearancePreference = 'system';

export function isAppearancePreference(preference: unknown): preference is AppearancePreference {
  return APPEARANCE_PREFERENCES.some((candidate) => candidate === preference);
}
