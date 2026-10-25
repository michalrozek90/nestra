import { shoppingListSummaryListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingListSummaryListDto extends createZodDto(shoppingListSummaryListSchema) {}
