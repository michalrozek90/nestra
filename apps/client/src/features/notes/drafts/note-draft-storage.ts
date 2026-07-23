import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const noteDraftSchema = z.strictObject({
  title: z.string(),
  content: z.string(),
  updatedAt: z.iso.datetime(),
  serverUpdatedAt: z.iso.datetime().optional(),
});

export type NoteDraft = z.infer<typeof noteDraftSchema>;

export type NoteDraftIdentity =
  { readonly kind: 'new' } | { readonly kind: 'existing'; readonly noteId: string };

export interface NoteDraftStorage {
  read(userId: string, identity: NoteDraftIdentity): Promise<NoteDraft | null>;
  write(userId: string, identity: NoteDraftIdentity, draft: NoteDraft): Promise<void>;
  remove(userId: string, identity: NoteDraftIdentity): Promise<void>;
  move(userId: string, from: NoteDraftIdentity, to: NoteDraftIdentity): Promise<void>;
}

class InvalidStoredNoteDraftError extends Error {
  public constructor(cause: unknown) {
    super('The stored note draft is invalid.', { cause });
    this.name = 'InvalidStoredNoteDraftError';
  }
}

function getDraftKey(userId: string, identity: NoteDraftIdentity): string {
  const identityKey = identity.kind === 'new' ? 'new' : `note.${identity.noteId}`;
  return `nestra.notes.drafts.${userId}.${identityKey}`;
}

class AsyncStorageNoteDraftStorage implements NoteDraftStorage {
  public async read(userId: string, identity: NoteDraftIdentity): Promise<NoteDraft | null> {
    const serializedDraft = await AsyncStorage.getItem(getDraftKey(userId, identity));
    if (!serializedDraft) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(serializedDraft);
      return noteDraftSchema.parse(parsedValue);
    } catch (error: unknown) {
      throw new InvalidStoredNoteDraftError(error);
    }
  }

  public async write(userId: string, identity: NoteDraftIdentity, draft: NoteDraft): Promise<void> {
    await AsyncStorage.setItem(
      getDraftKey(userId, identity),
      JSON.stringify(noteDraftSchema.parse(draft)),
    );
  }

  public async remove(userId: string, identity: NoteDraftIdentity): Promise<void> {
    await AsyncStorage.removeItem(getDraftKey(userId, identity));
  }

  public async move(userId: string, from: NoteDraftIdentity, to: NoteDraftIdentity): Promise<void> {
    const sourceKey = getDraftKey(userId, from);
    const targetKey = getDraftKey(userId, to);
    const serializedDraft = await AsyncStorage.getItem(sourceKey);

    if (serializedDraft) {
      await AsyncStorage.setItem(targetKey, serializedDraft);
    }
    await AsyncStorage.removeItem(sourceKey);
  }
}

export const noteDraftStorage: NoteDraftStorage = new AsyncStorageNoteDraftStorage();
