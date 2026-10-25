import { shoppingProductListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingProductListDto extends createZodDto(shoppingProductListSchema) {}
