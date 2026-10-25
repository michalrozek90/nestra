import { updateShoppingPresetSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingPresetDto extends createZodDto(updateShoppingPresetSchema) {}
