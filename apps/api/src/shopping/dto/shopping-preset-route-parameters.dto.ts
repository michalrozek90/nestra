import { shoppingPresetRouteParametersSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingPresetRouteParametersDto extends createZodDto(
  shoppingPresetRouteParametersSchema,
) {}
