import { shoppingPresetSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingPresetDto extends createZodDto(shoppingPresetSchema) {}
