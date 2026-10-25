import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
    getAllKeys: async () => [...storage.keys()],
    multiRemove: async (keys: readonly string[]) => {
      for (const key of keys) {
        storage.delete(key);
      }
    },
  },
}));

describe('noteDraftStorage.clearForUser', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('drops a draft written after the account is cleared', async () => {
    const { noteDraftStorage } = await import('./note-draft-storage');
    const userId = '11111111-1111-4111-8111-111111111111';
    const draft = { document: 'Private note', updatedAt: '2026-10-25T00:00:00.000Z' };

    await noteDraftStorage.clearForUser(userId);
    await noteDraftStorage.write(userId, { kind: 'new' }, draft);

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('removes a draft that was saved before the account is cleared', async () => {
    const { noteDraftStorage } = await import('./note-draft-storage');
    const userId = '22222222-2222-4222-8222-222222222222';

    await noteDraftStorage.write(
      userId,
      { kind: 'new' },
      { document: 'Private note', updatedAt: '2026-10-25T00:00:00.000Z' },
    );
    await noteDraftStorage.clearForUser(userId);

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
