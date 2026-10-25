import { shoppingStoreProfileSelectionSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingStoreProfileSelectionDto extends createZodDto(
  shoppingStoreProfileSelectionSchema,
) {}
