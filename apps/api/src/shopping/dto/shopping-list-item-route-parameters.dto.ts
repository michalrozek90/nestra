import { shoppingListItemRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingListItemRouteParametersDto extends createZodDto(
  shoppingListItemRouteParametersSchema,
) {}
