import {
  externalIdentityResponseSchema,
  googleAuthExchangeRequestSchema,
  googleAuthStartRequestSchema,
  googleAuthStartResponseSchema,
  googleLinkStartRequestSchema,
} from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class GoogleAuthStartRequestDto extends createZodDto(googleAuthStartRequestSchema) {}
export class GoogleLinkStartRequestDto extends createZodDto(googleLinkStartRequestSchema) {}
export class GoogleAuthStartResponseDto extends createZodDto(googleAuthStartResponseSchema) {}
export class GoogleAuthExchangeRequestDto extends createZodDto(googleAuthExchangeRequestSchema) {}
export class ExternalIdentityResponseDto extends createZodDto(externalIdentityResponseSchema) {}
