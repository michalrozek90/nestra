import { updateShoppingCategorySchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingCategoryDto extends createZodDto(updateShoppingCategorySchema) {}
