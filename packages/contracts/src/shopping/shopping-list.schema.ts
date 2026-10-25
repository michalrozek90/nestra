import { z } from 'zod';

import { shoppingProductNameSchema } from './shopping-product.schema';
import { normalizeShoppingDisplayText } from './shopping-text';

export const SHOPPING_LIST_NAME_MAX_LENGTH = 40;
export const SHOPPING_LIST_ITEM_LIMIT = 250;
export const SHOPPING_LIST_QUANTITY_MIN = 1;
export const SHOPPING_LIST_QUANTITY_MAX = 999;
export const SHOPPING_LIST_PRESET_APPLICATION_LIMIT = 20;

export const shoppingListNameSchema = z
  .string()
  .overwrite(normalizeShoppingDisplayText)
  .min(1)
  .max(SHOPPING_LIST_NAME_MAX_LENGTH);

export const shoppingListQuantitySchema = z
  .number()
  .int()
  .min(SHOPPING_LIST_QUANTITY_MIN)
  .max(SHOPPING_LIST_QUANTITY_MAX);

export const createShoppingListSchema = z.strictObject({
  name: shoppingListNameSchema,
});

export const updateShoppingListSchema = z
  .strictObject({
    name: shoppingListNameSchema.optional(),
    storeProfileId: z.uuid().nullable().optional(),
  })
  .refine((list) => list.name !== undefined || list.storeProfileId !== undefined, {
    message: 'A shopping list update must change the name or the store profile.',
  });

export const shoppingListRouteParametersSchema = z.strictObject({
  listId: z.uuid(),
});

export const shoppingListItemRouteParametersSchema = z.strictObject({
  listId: z.uuid(),
  itemId: z.uuid(),
});

export const updateShoppingListItemSchema = z
  .strictObject({
    quantity: shoppingListQuantitySchema.optional(),
    name: shoppingProductNameSchema.optional(),
    categoryId: z.uuid().optional(),
  })
  .superRefine((item, context) => {
    if (item.quantity === undefined && item.name === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A shopping-list item update must change the quantity or the product name.',
      });
    }

    if (item.categoryId !== undefined && item.name === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'A category can only be chosen when changing the product name.',
      });
    }
  });

export const applyShoppingListPresetsSchema = z.strictObject({
  presetIds: z.array(z.uuid()).min(1).max(SHOPPING_LIST_PRESET_APPLICATION_LIMIT),
});

export const addShoppingListItemSchema = z
  .strictObject({
    productId: z.uuid().optional(),
    name: shoppingProductNameSchema.optional(),
    categoryId: z.uuid().optional(),
    quantity: shoppingListQuantitySchema.optional(),
  })
  .superRefine((item, context) => {
    const identifiesExistingProduct = item.productId !== undefined;
    const identifiesNamedProduct = item.name !== undefined;

    if (identifiesExistingProduct === identifiesNamedProduct) {
      context.addIssue({
        code: 'custom',
        message: 'Provide either a remembered product id or a product name.',
      });
    }

    if (item.categoryId !== undefined && !identifiesNamedProduct) {
      context.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'A category can only be chosen when adding a product by name.',
      });
    }
  });

export const shoppingListItemSchema = z.strictObject({
  id: z.uuid(),
  productId: z.uuid(),
  name: shoppingProductNameSchema,
  categoryId: z.uuid(),
  quantity: shoppingListQuantitySchema,
  position: z.number().int().min(0),
});

export const shoppingListSchema = z.strictObject({
  id: z.uuid(),
  name: shoppingListNameSchema,
  storeProfileId: z.uuid().nullable(),
  items: z.array(shoppingListItemSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingListSummarySchema = z.strictObject({
  id: z.uuid(),
  name: shoppingListNameSchema,
  storeProfileId: z.uuid().nullable(),
  itemCount: z.number().int().min(0).max(SHOPPING_LIST_ITEM_LIMIT),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingListSummaryListSchema = z.array(shoppingListSummarySchema);

export type CreateShoppingList = z.infer<typeof createShoppingListSchema>;
export type UpdateShoppingList = z.infer<typeof updateShoppingListSchema>;
export type ShoppingListRouteParameters = z.infer<typeof shoppingListRouteParametersSchema>;
export type ShoppingListItemRouteParameters = z.infer<typeof shoppingListItemRouteParametersSchema>;
export type AddShoppingListItem = z.infer<typeof addShoppingListItemSchema>;
export type UpdateShoppingListItem = z.infer<typeof updateShoppingListItemSchema>;
export type ApplyShoppingListPresets = z.infer<typeof applyShoppingListPresetsSchema>;
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;
export type ShoppingList = z.infer<typeof shoppingListSchema>;
export type ShoppingListSummary = z.infer<typeof shoppingListSummarySchema>;
export type ShoppingListSummaryList = z.infer<typeof shoppingListSummaryListSchema>;
