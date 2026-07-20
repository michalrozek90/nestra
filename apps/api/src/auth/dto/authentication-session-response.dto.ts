import { authenticationSessionResponseSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class AuthenticationSessionResponseDto extends createZodDto(
  authenticationSessionResponseSchema,
) {}
