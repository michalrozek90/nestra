import { replaceShoppingStoreProfileOrderSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceShoppingStoreProfileOrderDto extends createZodDto(
  replaceShoppingStoreProfileOrderSchema,
) {}
