import { updateShoppingProductSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingProductDto extends createZodDto(updateShoppingProductSchema) {}
