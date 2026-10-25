import { z } from 'zod';

import { shoppingListQuantitySchema } from './shopping-list.schema';
import { shoppingProductNameSchema } from './shopping-product.schema';
import { normalizeShoppingDisplayText } from './shopping-text';

export const SHOPPING_PRESET_NAME_MAX_LENGTH = 30;
export const SHOPPING_PRESET_LIMIT = 20;
export const SHOPPING_PRESET_ENTRY_LIMIT = 150;

export const shoppingPresetNameSchema = z
  .string()
  .overwrite(normalizeShoppingDisplayText)
  .min(1)
  .max(SHOPPING_PRESET_NAME_MAX_LENGTH);

export const shoppingPresetEntryInputSchema = z.strictObject({
  productId: z.uuid(),
  quantity: shoppingListQuantitySchema,
});

export const createShoppingPresetSchema = z.strictObject({
  name: shoppingPresetNameSchema,
  storeProfileId: z.uuid().nullable().optional(),
  entries: z.array(shoppingPresetEntryInputSchema).optional(),
});

export const updateShoppingPresetSchema = z
  .strictObject({
    name: shoppingPresetNameSchema.optional(),
    storeProfileId: z.uuid().nullable().optional(),
  })
  .refine((preset) => preset.name !== undefined || preset.storeProfileId !== undefined, {
    message: 'A shopping preset update must change the name or the store profile.',
  });

export const replaceShoppingPresetEntriesSchema = z.strictObject({
  entries: z.array(shoppingPresetEntryInputSchema),
});

export const shoppingPresetRouteParametersSchema = z.strictObject({
  presetId: z.uuid(),
});

export const shoppingPresetEntrySchema = z.strictObject({
  id: z.uuid(),
  productId: z.uuid(),
  name: shoppingProductNameSchema,
  categoryId: z.uuid(),
  quantity: shoppingListQuantitySchema,
  position: z.number().int().min(0),
});

export const shoppingPresetSchema = z.strictObject({
  id: z.uuid(),
  name: shoppingPresetNameSchema,
  storeProfileId: z.uuid().nullable(),
  entries: z.array(shoppingPresetEntrySchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingPresetSummarySchema = z.strictObject({
  id: z.uuid(),
  name: shoppingPresetNameSchema,
  storeProfileId: z.uuid().nullable(),
  entryCount: z.number().int().min(0).max(SHOPPING_PRESET_ENTRY_LIMIT),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingPresetSummaryListSchema = z.array(shoppingPresetSummarySchema);

export type CreateShoppingPreset = z.infer<typeof createShoppingPresetSchema>;
export type UpdateShoppingPreset = z.infer<typeof updateShoppingPresetSchema>;
export type ReplaceShoppingPresetEntries = z.infer<typeof replaceShoppingPresetEntriesSchema>;
export type ShoppingPresetRouteParameters = z.infer<typeof shoppingPresetRouteParametersSchema>;
export type ShoppingPresetEntry = z.infer<typeof shoppingPresetEntrySchema>;
export type ShoppingPreset = z.infer<typeof shoppingPresetSchema>;
export type ShoppingPresetSummary = z.infer<typeof shoppingPresetSummarySchema>;
export type ShoppingPresetSummaryList = z.infer<typeof shoppingPresetSummaryListSchema>;
