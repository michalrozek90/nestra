import { updateShoppingStoreProfileSchema } from '@nestra/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateShoppingStoreProfileDto extends createZodDto(updateShoppingStoreProfileSchema) {}
