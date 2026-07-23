import { updateNoteSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateNoteDto extends createZodDto(updateNoteSchema) {}
