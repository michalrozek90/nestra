import { shoppingStoreProfileSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingStoreProfileDto extends createZodDto(shoppingStoreProfileSchema) {}
