import type { ApplicationUpdatePlatform } from './application-update.types';

export const applicationUpdatePlatform: ApplicationUpdatePlatform = {
  isSupported: false,
  async check() {
    return null;
  },
  async relaunch() {},
};
