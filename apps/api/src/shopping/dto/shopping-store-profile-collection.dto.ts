import { shoppingStoreProfileCollectionSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingStoreProfileCollectionDto extends createZodDto(
  shoppingStoreProfileCollectionSchema,
) {}
