import { z } from 'zod';

export const emptyTrashResponseSchema = z.strictObject({
  deletedNotesCount: z.number().int().nonnegative(),
});

export type EmptyTrashResponse = z.infer<typeof emptyTrashResponseSchema>;
