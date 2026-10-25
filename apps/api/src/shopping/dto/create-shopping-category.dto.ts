import { createShoppingCategorySchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingCategoryDto extends createZodDto(createShoppingCategorySchema) {}
