import { updateShoppingListItemSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingListItemDto extends createZodDto(updateShoppingListItemSchema) {}
