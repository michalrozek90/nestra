import { apiErrorResponseSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ApiErrorResponseDto extends createZodDto(apiErrorResponseSchema) {}
