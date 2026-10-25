import { z } from 'zod';

import { normalizeShoppingDisplayText } from './shopping-text';

export const SHOPPING_PRODUCT_NAME_MAX_LENGTH = 30;

// Unicode lowercase can expand one character into two, as with İ.
export const SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH = SHOPPING_PRODUCT_NAME_MAX_LENGTH * 2;

export const shoppingProductNameSchema = z
  .string()
  .overwrite(normalizeShoppingDisplayText)
  .min(1)
  .max(SHOPPING_PRODUCT_NAME_MAX_LENGTH);

export const createShoppingProductSchema = z.strictObject({
  name: shoppingProductNameSchema,
  categoryId: z.uuid().optional(),
});

export const updateShoppingProductSchema = z
  .strictObject({
    name: shoppingProductNameSchema.optional(),
    categoryId: z.uuid().optional(),
  })
  .refine((product) => product.name !== undefined || product.categoryId !== undefined, {
    message: 'A remembered product update must change the name or the category.',
  });

export const shoppingProductRouteParametersSchema = z.strictObject({
  productId: z.uuid(),
});

export const shoppingProductSchema = z.strictObject({
  id: z.uuid(),
  name: shoppingProductNameSchema,
  categoryId: z.uuid(),
  usageCount: z.number().int().min(0),
  lastUsedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingProductListSchema = z.array(shoppingProductSchema);

export type CreateShoppingProduct = z.infer<typeof createShoppingProductSchema>;
export type UpdateShoppingProduct = z.infer<typeof updateShoppingProductSchema>;
export type ShoppingProductRouteParameters = z.infer<typeof shoppingProductRouteParametersSchema>;
export type ShoppingProduct = z.infer<typeof shoppingProductSchema>;
export type ShoppingProductList = z.infer<typeof shoppingProductListSchema>;

export function nextShoppingListUsage(
  usageCount: number,
  usedAt: Date,
): { readonly usageCount: number; readonly lastUsedAt: Date } {
  return {
    usageCount: usageCount + 1,
    lastUsedAt: usedAt,
  };
}
