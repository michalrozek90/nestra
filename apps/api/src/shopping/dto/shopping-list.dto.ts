import { shoppingListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingListDto extends createZodDto(shoppingListSchema) {}
