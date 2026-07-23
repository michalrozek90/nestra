import { z } from 'zod';

export const updateNoteSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(20_000).optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    ({ title, content, isPinned, isArchived }) =>
      title !== undefined ||
      content !== undefined ||
      isPinned !== undefined ||
      isArchived !== undefined,
    {
      message: 'At least one supported note field is required.',
    },
  );

export type UpdateNote = z.infer<typeof updateNoteSchema>;
