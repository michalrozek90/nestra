import { publicUserSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class PublicUserDto extends createZodDto(publicUserSchema) {}
