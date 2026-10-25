import { createShoppingStoreProfileSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingStoreProfileDto extends createZodDto(createShoppingStoreProfileSchema) {}
