import { registerRequestSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterRequestDto extends createZodDto(registerRequestSchema) {}
