import { relaunch } from '@tauri-apps/plugin-process';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';

import { runtimeConfig } from '@/config/runtime-config';
import { isTauriRuntime } from '@/infrastructure/auth/is-tauri-runtime';
import type {
  ApplicationUpdateDownloadProgress,
  ApplicationUpdateHandle,
  ApplicationUpdatePlatform,
} from './application-update.types';

const CHECK_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60_000;
const MAX_RELEASE_NOTES_LENGTH = 4_000;

function sanitizeReleaseNotes(notes: string | undefined): string | undefined {
  const trimmedNotes = notes?.trim();
  return trimmedNotes ? trimmedNotes.slice(0, MAX_RELEASE_NOTES_LENGTH) : undefined;
}

class TauriApplicationUpdate implements ApplicationUpdateHandle {
  readonly version: string;
  readonly notes: string | undefined;

  constructor(private readonly update: Update) {
    this.version = update.version;
    this.notes = sanitizeReleaseNotes(update.body);
  }

  async download(onProgress: (progress: ApplicationUpdateDownloadProgress) => void): Promise<void> {
    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    await this.update.download(
      (event: DownloadEvent) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength;
          onProgress({ downloadedBytes, ...(totalBytes ? { totalBytes } : {}) });
          return;
        }

        if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          onProgress({ downloadedBytes, ...(totalBytes ? { totalBytes } : {}) });
        }
      },
      { timeout: DOWNLOAD_TIMEOUT_MS },
    );
  }

  async install(): Promise<void> {
    await this.update.install();
  }

  async close(): Promise<void> {
    await this.update.close();
  }
}

const isSupported = isTauriRuntime() && runtimeConfig.environment === 'production';

export const applicationUpdatePlatform: ApplicationUpdatePlatform = {
  isSupported,
  async check() {
    if (!isSupported) {
      return null;
    }

    const update = await check({
      allowDowngrades: false,
      timeout: CHECK_TIMEOUT_MS,
    });
    return update ? new TauriApplicationUpdate(update) : null;
  },
  async relaunch() {
    await relaunch();
  },
};
