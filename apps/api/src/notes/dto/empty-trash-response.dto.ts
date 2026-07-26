import { emptyTrashResponseSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class EmptyTrashResponseDto extends createZodDto(emptyTrashResponseSchema) {}
