import { createShoppingProductSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateShoppingProductDto extends createZodDto(createShoppingProductSchema) {}
