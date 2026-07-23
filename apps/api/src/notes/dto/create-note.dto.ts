import { createNoteSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateNoteDto extends createZodDto(createNoteSchema) {}
