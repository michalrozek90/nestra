import { applyShoppingListPresetsSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ApplyShoppingListPresetsDto extends createZodDto(applyShoppingListPresetsSchema) {}
