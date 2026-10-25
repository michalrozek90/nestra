import { createShoppingListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingListDto extends createZodDto(createShoppingListSchema) {}
