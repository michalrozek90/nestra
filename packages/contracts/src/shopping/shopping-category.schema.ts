import { z } from 'zod';

import { normalizeShoppingDisplayText } from './shopping-text';

export const SHOPPING_CATEGORY_NAME_MAX_LENGTH = 40;

// Unicode lowercase can expand one character into two, as with İ.
export const SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH = SHOPPING_CATEGORY_NAME_MAX_LENGTH * 2;

export const SHOPPING_BUILT_IN_CATEGORY_KEYS = [
  'fruit_and_vegetables',
  'bakery',
  'dairy',
  'meat',
  'frozen',
  'beverages',
  'household',
  'cosmetics',
  'other',
] as const;

export const shoppingBuiltInCategoryKeySchema = z.enum(SHOPPING_BUILT_IN_CATEGORY_KEYS);

export type ShoppingBuiltInCategoryKey = z.infer<typeof shoppingBuiltInCategoryKeySchema>;

export const SHOPPING_CATEGORY_KINDS = ['built_in', 'custom'] as const;

export const shoppingCategoryKindSchema = z.enum(SHOPPING_CATEGORY_KINDS);

export type ShoppingCategoryKind = z.infer<typeof shoppingCategoryKindSchema>;

export const SHOPPING_BUILT_IN_CATEGORY_IDS = {
  fruit_and_vegetables: '8d2f4c1a-6b3e-4a57-9c10-2e7b5a9d4f31',
  bakery: '3c6e1b90-5a24-4f7d-8b61-9d0e2c4a7b18',
  dairy: '7a1e9c42-0d58-4b63-a2f4-6c8d1e5b9037',
  meat: '2b8d4f67-1c90-4e35-9a72-5f3c8d6e1a04',
  frozen: '9e4a2c85-7f16-4d28-b390-1a6c5e8d2b47',
  beverages: '4f7c3a19-8e62-4b05-9d14-7c2a6f0e5b83',
  household: '6a0d8e53-2b47-4c91-8f36-9e1b4d7a0c25',
  cosmetics: '1c5b9e70-4a83-4f26-b158-3d7e2a6c9f04',
  other: '0e8a4d21-6c59-4b73-a047-5f1d9c3e8b62',
} as const satisfies Record<ShoppingBuiltInCategoryKey, string>;

export const SHOPPING_OTHER_CATEGORY_ID = SHOPPING_BUILT_IN_CATEGORY_IDS.other;

export const SHOPPING_BUILT_IN_CATEGORY_LABELS = {
  en: {
    fruit_and_vegetables: 'Fruit & vegetables',
    bakery: 'Bakery',
    dairy: 'Dairy',
    meat: 'Meat',
    frozen: 'Frozen',
    beverages: 'Beverages',
    household: 'Household',
    cosmetics: 'Cosmetics',
    other: 'Other',
  },
  pl: {
    fruit_and_vegetables: 'Owoce i warzywa',
    bakery: 'Pieczywo',
    dairy: 'Nabiał',
    meat: 'Mięso',
    frozen: 'Mrożonki',
    beverages: 'Napoje',
    household: 'Artykuły domowe',
    cosmetics: 'Kosmetyki',
    other: 'Inne',
  },
} as const satisfies Record<'en' | 'pl', Record<ShoppingBuiltInCategoryKey, string>>;

export function getShoppingBuiltInCategoryPosition(key: ShoppingBuiltInCategoryKey): number {
  const position = SHOPPING_BUILT_IN_CATEGORY_KEYS.indexOf(key);

  if (position < 0) {
    throw new Error(`Unknown built-in shopping category: ${key}`);
  }

  return position;
}

export function getShoppingBuiltInCategoryLabels(key: ShoppingBuiltInCategoryKey): {
  readonly en: string;
  readonly pl: string;
} {
  return {
    en: SHOPPING_BUILT_IN_CATEGORY_LABELS.en[key],
    pl: SHOPPING_BUILT_IN_CATEGORY_LABELS.pl[key],
  };
}

export const shoppingCategoryNameSchema = z
  .string()
  .overwrite(normalizeShoppingDisplayText)
  .min(1)
  .max(SHOPPING_CATEGORY_NAME_MAX_LENGTH);

export const createShoppingCategorySchema = z.strictObject({
  name: shoppingCategoryNameSchema,
});

export const updateShoppingCategorySchema = z.strictObject({
  name: shoppingCategoryNameSchema,
});

export const shoppingCategoryRouteParametersSchema = z.strictObject({
  categoryId: z.uuid(),
});

const shoppingCategoryLabelsSchema = z.strictObject({
  en: z.string().min(1),
  pl: z.string().min(1),
});

export const shoppingCategorySchema = z
  .strictObject({
    id: z.uuid(),
    kind: shoppingCategoryKindSchema,
    builtInKey: shoppingBuiltInCategoryKeySchema.nullable(),
    name: z.string().min(1).max(SHOPPING_CATEGORY_NAME_MAX_LENGTH).nullable(),
    labels: shoppingCategoryLabelsSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((category, context) => {
    if (category.kind === 'built_in') {
      refineBuiltInShoppingCategory(category, context);
      return;
    }

    refineCustomShoppingCategory(category, context);
  });

export const shoppingCategoryListSchema = z.array(shoppingCategorySchema);

export type CreateShoppingCategory = z.infer<typeof createShoppingCategorySchema>;
export type UpdateShoppingCategory = z.infer<typeof updateShoppingCategorySchema>;
export type ShoppingCategoryRouteParameters = z.infer<typeof shoppingCategoryRouteParametersSchema>;
export type ShoppingCategory = z.infer<typeof shoppingCategorySchema>;
export type ShoppingCategoryList = z.infer<typeof shoppingCategoryListSchema>;

function refineBuiltInShoppingCategory(
  category: {
    readonly id: string;
    readonly builtInKey: ShoppingBuiltInCategoryKey | null;
    readonly name: string | null;
    readonly labels: { readonly en: string; readonly pl: string } | null;
  },
  context: z.RefinementCtx,
): void {
  if (category.builtInKey === null) {
    context.addIssue({
      code: 'custom',
      path: ['builtInKey'],
      message: 'A built-in shopping category requires its stable key.',
    });
    return;
  }

  const builtInKey = category.builtInKey;

  if (category.name !== null) {
    context.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'A built-in shopping category does not store a custom name.',
    });
  }

  if (category.labels === null) {
    context.addIssue({
      code: 'custom',
      path: ['labels'],
      message: 'A built-in shopping category requires English and Polish labels.',
    });
    return;
  }

  if (category.id !== SHOPPING_BUILT_IN_CATEGORY_IDS[builtInKey]) {
    context.addIssue({
      code: 'custom',
      path: ['id'],
      message: 'The built-in shopping category id does not match its stable key.',
    });
  }

  const expectedLabels = getShoppingBuiltInCategoryLabels(builtInKey);

  if (category.labels.en !== expectedLabels.en || category.labels.pl !== expectedLabels.pl) {
    context.addIssue({
      code: 'custom',
      path: ['labels'],
      message: 'Built-in shopping category labels must match the shared catalog.',
    });
  }
}

function refineCustomShoppingCategory(
  category: {
    readonly builtInKey: ShoppingBuiltInCategoryKey | null;
    readonly name: string | null;
    readonly labels: { readonly en: string; readonly pl: string } | null;
  },
  context: z.RefinementCtx,
): void {
  if (category.builtInKey !== null) {
    context.addIssue({
      code: 'custom',
      path: ['builtInKey'],
      message: 'A custom shopping category cannot use a built-in key.',
    });
  }

  if (category.name === null) {
    context.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'A custom shopping category requires a name.',
    });
  }

  if (category.labels !== null) {
    context.addIssue({
      code: 'custom',
      path: ['labels'],
      message: 'A custom shopping category does not have built-in labels.',
    });
  }
}
