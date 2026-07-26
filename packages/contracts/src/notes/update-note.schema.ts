import { z } from 'zod';

export const updateNoteSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().max(20_000).optional(),
    isPinned: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
  })
  .refine(
    ({ title, content, isPinned, isTrashed }) =>
      title !== undefined ||
      content !== undefined ||
      isPinned !== undefined ||
      isTrashed !== undefined,
    {
      message: 'At least one supported note field is required.',
    },
  );

export type UpdateNote = z.infer<typeof updateNoteSchema>;
