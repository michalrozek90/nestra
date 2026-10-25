import { shoppingProductRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingProductRouteParametersDto extends createZodDto(
  shoppingProductRouteParametersSchema,
) {}
