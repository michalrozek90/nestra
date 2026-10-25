import { shoppingListRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingListRouteParametersDto extends createZodDto(
  shoppingListRouteParametersSchema,
) {}
