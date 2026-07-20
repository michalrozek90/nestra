import { loginRequestSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class LoginRequestDto extends createZodDto(loginRequestSchema) {}
