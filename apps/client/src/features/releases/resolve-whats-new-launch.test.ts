import { describe, expect, it, vi } from 'vitest';

import { resolveWhatsNewLaunch, type WhatsNewLaunchDependencies } from './resolve-whats-new-launch';

function createMemoryDependencies(initialVersion: string | null) {
  let storedVersion = initialVersion;
  const writeLastSeenVersion = vi.fn(async (version: string): Promise<void> => {
    storedVersion = version;
  });

  return {
    dependencies: {
      onPreferenceStorageError: vi.fn(),
      readLastSeenVersion: async () => storedVersion,
      writeLastSeenVersion,
    },
    getStoredVersion: () => storedVersion,
    writeLastSeenVersion,
  };
}

describe('resolveWhatsNewLaunch', () => {
  it('stores the installed version without showing release notes on first launch', async () => {
    const { dependencies, getStoredVersion, writeLastSeenVersion } = createMemoryDependencies(null);

    const launchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(launchState.isVisible).toBe(false);
    expect(launchState.releaseNotes).toEqual([]);
    expect(writeLastSeenVersion).toHaveBeenCalledWith('0.3.0');
    expect(getStoredVersion()).toBe('0.3.0');
  });

  it('does not show release notes when the same version launches again', async () => {
    const { dependencies, writeLastSeenVersion } = createMemoryDependencies(null);

    await resolveWhatsNewLaunch('0.3.0', dependencies);
    const repeatedLaunchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(repeatedLaunchState.isVisible).toBe(false);
    expect(repeatedLaunchState.releaseNotes).toEqual([]);
    expect(writeLastSeenVersion).toHaveBeenCalledTimes(1);
  });

  it('shows only the missed release after a one-version upgrade', async () => {
    const { dependencies } = createMemoryDependencies('0.2.0');

    const launchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(launchState.releaseNotes.map((releaseNote) => releaseNote.version)).toEqual(['0.3.0']);
    expect(launchState.isVisible).toBe(true);
  });

  it('shows every missed release newest first after a skipped-version upgrade', async () => {
    const { dependencies } = createMemoryDependencies('0.1.0');

    const launchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(launchState.releaseNotes.map((releaseNote) => releaseNote.version)).toEqual([
      '0.3.0',
      '0.2.0',
    ]);
    expect(launchState.isVisible).toBe(true);
  });

  it('keeps the dialog hidden when the first-launch baseline cannot be stored', async () => {
    const storageError = new Error('storage unavailable');
    const onPreferenceStorageError = vi.fn();
    const dependencies: WhatsNewLaunchDependencies = {
      onPreferenceStorageError,
      readLastSeenVersion: async () => null,
      writeLastSeenVersion: async () => Promise.reject(storageError),
    };

    const launchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(launchState.isVisible).toBe(false);
    expect(onPreferenceStorageError).toHaveBeenCalledWith('write', storageError);
  });

  it('keeps the dialog hidden when the stored version cannot be read', async () => {
    const storageError = new Error('storage unavailable');
    const onPreferenceStorageError = vi.fn();
    const dependencies: WhatsNewLaunchDependencies = {
      onPreferenceStorageError,
      readLastSeenVersion: async () => Promise.reject(storageError),
      writeLastSeenVersion: vi.fn(),
    };

    const launchState = await resolveWhatsNewLaunch('0.3.0', dependencies);

    expect(launchState.isVisible).toBe(false);
    expect(onPreferenceStorageError).toHaveBeenCalledWith('read', storageError);
    expect(dependencies.writeLastSeenVersion).not.toHaveBeenCalled();
  });
});
