import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

const noteDraftMetadataSchema = z.strictObject({
  updatedAt: z.iso.datetime(),
  serverUpdatedAt: z.iso.datetime().optional(),
});
const noteDraftSchema = noteDraftMetadataSchema.extend({
  document: z.string(),
});
const legacyNoteDraftSchema = noteDraftMetadataSchema.extend({
  title: z.string(),
  content: z.string(),
});
const storedNoteDraftSchema = z.union([noteDraftSchema, legacyNoteDraftSchema]);
const noteIdSchema = z.uuid();

export type NoteDraft = z.infer<typeof noteDraftSchema>;

export type NoteDraftIdentity =
  { readonly kind: 'new' } | { readonly kind: 'existing'; readonly noteId: string };

export interface NoteDraftStorage {
  read(userId: string, identity: NoteDraftIdentity): Promise<NoteDraft | null>;
  write(userId: string, identity: NoteDraftIdentity, draft: NoteDraft): Promise<void>;
  remove(userId: string, identity: NoteDraftIdentity): Promise<void>;
  move(userId: string, from: NoteDraftIdentity, to: NoteDraftIdentity): Promise<void>;
  listExistingNoteIds(userId: string): Promise<readonly string[]>;
  probeAvailability(): Promise<boolean>;
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

function getExistingDraftKeyPrefix(userId: string): string {
  return `nestra.notes.drafts.${userId}.note.`;
}

function toCurrentNoteDraft(storedDraft: z.infer<typeof storedNoteDraftSchema>): NoteDraft {
  if ('document' in storedDraft) {
    return storedDraft;
  }

  return {
    document:
      storedDraft.content.length > 0
        ? `${storedDraft.title}\n\n${storedDraft.content}`
        : storedDraft.title,
    updatedAt: storedDraft.updatedAt,
    ...(storedDraft.serverUpdatedAt ? { serverUpdatedAt: storedDraft.serverUpdatedAt } : {}),
  };
}

class AsyncStorageNoteDraftStorage implements NoteDraftStorage {
  public async read(userId: string, identity: NoteDraftIdentity): Promise<NoteDraft | null> {
    const serializedDraft = await AsyncStorage.getItem(getDraftKey(userId, identity));
    if (!serializedDraft) {
      return null;
    }

    try {
      const parsedValue: unknown = JSON.parse(serializedDraft);
      return toCurrentNoteDraft(storedNoteDraftSchema.parse(parsedValue));
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

  public async listExistingNoteIds(userId: string): Promise<readonly string[]> {
    const draftKeyPrefix = getExistingDraftKeyPrefix(userId);
    const storageKeys = await AsyncStorage.getAllKeys();

    return storageKeys.flatMap((storageKey) => {
      if (!storageKey.startsWith(draftKeyPrefix)) {
        return [];
      }

      const parsedNoteId = noteIdSchema.safeParse(storageKey.slice(draftKeyPrefix.length));
      return parsedNoteId.success ? [parsedNoteId.data] : [];
    });
  }

  public async probeAvailability(): Promise<boolean> {
    const probeKey = 'nestra.notes.drafts.__availability_probe__';

    try {
      await AsyncStorage.setItem(probeKey, 'ok');
      await AsyncStorage.removeItem(probeKey);
      return true;
    } catch {
      return false;
    }
  }
}

export const noteDraftStorage: NoteDraftStorage = new AsyncStorageNoteDraftStorage();
