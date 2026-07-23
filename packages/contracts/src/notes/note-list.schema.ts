import { z } from 'zod';

import { noteSchema } from './note.schema';

export const noteListSchema = z.array(noteSchema);

export type NoteList = z.infer<typeof noteListSchema>;
