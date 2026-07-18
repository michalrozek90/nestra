import { enAuth } from './en/auth';
import { enCommon } from './en/common';
import { enNotes } from './en/notes';
import { enReleases } from './en/releases';
import { enSettings } from './en/settings';
import { plAuth } from './pl/auth';
import { plCommon } from './pl/common';
import { plNotes } from './pl/notes';
import { plReleases } from './pl/releases';
import { plSettings } from './pl/settings';

export const resources = {
  en: {
    auth: enAuth,
    common: enCommon,
    notes: enNotes,
    releases: enReleases,
    settings: enSettings,
  },
  pl: {
    auth: plAuth,
    common: plCommon,
    notes: plNotes,
    releases: plReleases,
    settings: plSettings,
  },
} as const;
