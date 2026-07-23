import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const noteRouteParametersSchema = z.strictObject({
  noteId: z.uuid(),
});

export class NoteRouteParametersDto extends createZodDto(noteRouteParametersSchema) {}
