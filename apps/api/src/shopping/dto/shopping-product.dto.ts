import { shoppingProductSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingProductDto extends createZodDto(shoppingProductSchema) {}
