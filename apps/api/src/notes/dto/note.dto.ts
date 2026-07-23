import { noteSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class NoteDto extends createZodDto(noteSchema) {}
