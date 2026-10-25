import { z } from 'zod';

import { normalizeShoppingDisplayText } from './shopping-text';

export const SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH = 40;

export const shoppingStoreProfileNameSchema = z
  .string()
  .overwrite(normalizeShoppingDisplayText)
  .min(1)
  .max(SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH);

export const createShoppingStoreProfileSchema = z.strictObject({
  name: shoppingStoreProfileNameSchema,
});

export const updateShoppingStoreProfileSchema = z.strictObject({
  name: shoppingStoreProfileNameSchema,
});

export const shoppingStoreProfileRouteParametersSchema = z.strictObject({
  profileId: z.uuid(),
});

export const replaceShoppingStoreProfileOrderSchema = z.strictObject({
  categoryIds: z.array(z.uuid()).min(1),
});

export const shoppingStoreProfileSchema = z.strictObject({
  id: z.uuid(),
  name: shoppingStoreProfileNameSchema,
  categoryIds: z.array(z.uuid()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const shoppingStoreProfileCollectionSchema = z.strictObject({
  lastSelectedProfileId: z.uuid().nullable(),
  profiles: z.array(shoppingStoreProfileSchema),
});

export const shoppingStoreProfileSelectionSchema = z.strictObject({
  lastSelectedProfileId: z.uuid(),
});

export type CreateShoppingStoreProfile = z.infer<typeof createShoppingStoreProfileSchema>;
export type UpdateShoppingStoreProfile = z.infer<typeof updateShoppingStoreProfileSchema>;
export type ShoppingStoreProfileRouteParameters = z.infer<
  typeof shoppingStoreProfileRouteParametersSchema
>;
export type ReplaceShoppingStoreProfileOrder = z.infer<
  typeof replaceShoppingStoreProfileOrderSchema
>;
export type ShoppingStoreProfile = z.infer<typeof shoppingStoreProfileSchema>;
export type ShoppingStoreProfileCollection = z.infer<typeof shoppingStoreProfileCollectionSchema>;
export type ShoppingStoreProfileSelection = z.infer<typeof shoppingStoreProfileSelectionSchema>;
