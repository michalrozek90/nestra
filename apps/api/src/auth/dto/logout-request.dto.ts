import { logoutRequestSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class LogoutRequestDto extends createZodDto(logoutRequestSchema) {}
