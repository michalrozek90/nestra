import { notesQuerySchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class NotesQueryDto extends createZodDto(notesQuerySchema) {}
