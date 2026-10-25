import { replaceShoppingPresetEntriesSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceShoppingPresetEntriesDto extends createZodDto(
  replaceShoppingPresetEntriesSchema,
) {}
