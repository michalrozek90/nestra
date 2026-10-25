import { shoppingStoreProfileRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingStoreProfileRouteParametersDto extends createZodDto(
  shoppingStoreProfileRouteParametersSchema,
) {}
