import { shoppingPresetSummaryListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingPresetSummaryListDto extends createZodDto(shoppingPresetSummaryListSchema) {}
