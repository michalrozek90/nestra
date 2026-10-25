import { shoppingCategoryListSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingCategoryListDto extends createZodDto(shoppingCategoryListSchema) {}
