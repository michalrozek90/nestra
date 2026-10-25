import { createShoppingPresetSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingPresetDto extends createZodDto(createShoppingPresetSchema) {}
