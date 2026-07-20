import { refreshRequestSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class RefreshRequestDto extends createZodDto(refreshRequestSchema) {}
