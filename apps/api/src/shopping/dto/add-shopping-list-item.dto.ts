import { addShoppingListItemSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class AddShoppingListItemDto extends createZodDto(addShoppingListItemSchema) {}
