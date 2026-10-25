import { updateShoppingListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingListDto extends createZodDto(updateShoppingListSchema) {}
