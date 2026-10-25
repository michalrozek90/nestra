import { shoppingCategoryRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingCategoryRouteParametersDto extends createZodDto(
  shoppingCategoryRouteParametersSchema,
) {}
