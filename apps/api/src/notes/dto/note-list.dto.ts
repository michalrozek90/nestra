import { noteListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class NoteListDto extends createZodDto(noteListSchema) {}
