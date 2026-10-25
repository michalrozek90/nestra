import { shoppingCategorySchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShoppingCategoryDto extends createZodDto(shoppingCategorySchema) {}
