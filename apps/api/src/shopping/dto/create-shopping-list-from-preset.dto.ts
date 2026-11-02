import { createShoppingListFromPresetSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingListFromPresetDto extends createZodDto(
  createShoppingListFromPresetSchema,
) {}
