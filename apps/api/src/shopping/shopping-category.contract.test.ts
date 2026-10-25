import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SHOPPING_BUILT_IN_CATEGORY_IDS,
  SHOPPING_BUILT_IN_CATEGORY_KEYS,
  SHOPPING_BUILT_IN_CATEGORY_LABELS,
  SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH,
  SHOPPING_CATEGORY_NAME_MAX_LENGTH,
  SHOPPING_OTHER_CATEGORY_ID,
  getShoppingBuiltInCategoryPosition,
  shoppingCategoryNameSchema,
  shoppingCategorySchema,
  toShoppingComparisonKey,
} from '@nestra/contracts';

describe('shopping category contracts', () => {
  it('normalizes display text without changing its case', () => {
    assert.equal(toShoppingComparisonKey('  MĄKA   RAZOWA  '), 'mąka razowa');
    assert.equal(shoppingCategoryNameSchema.parse('  Fresh   herbs  '), 'Fresh herbs');
  });

  it('rejects blank and overlong category names', () => {
    assert.equal(shoppingCategoryNameSchema.safeParse('   ').success, false);
    assert.equal(
      shoppingCategoryNameSchema.safeParse('a'.repeat(SHOPPING_CATEGORY_NAME_MAX_LENGTH)).success,
      true,
    );
    assert.equal(
      shoppingCategoryNameSchema.safeParse('a'.repeat(SHOPPING_CATEGORY_NAME_MAX_LENGTH + 1))
        .success,
      false,
    );
  });

  it('keeps an expanded lowercase key inside the stored key limit', () => {
    const dottedCapitalI = '\u0130';
    const displayName = dottedCapitalI + 'a'.repeat(SHOPPING_CATEGORY_NAME_MAX_LENGTH - 1);
    const fullyExpandedName = dottedCapitalI.repeat(SHOPPING_CATEGORY_NAME_MAX_LENGTH);

    assert.equal(shoppingCategoryNameSchema.parse(displayName), displayName);
    assert.equal(toShoppingComparisonKey(displayName).length, 41);
    assert.equal(
      toShoppingComparisonKey(fullyExpandedName).length,
      SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH,
    );
  });

  it('gives every built-in category one stable id, position, and both labels', () => {
    const ids = new Set<string>();

    for (const [position, key] of SHOPPING_BUILT_IN_CATEGORY_KEYS.entries()) {
      const id = SHOPPING_BUILT_IN_CATEGORY_IDS[key];
      ids.add(id);
      assert.equal(getShoppingBuiltInCategoryPosition(key), position);
      assert.equal(SHOPPING_BUILT_IN_CATEGORY_LABELS.en[key].length > 0, true);
      assert.equal(SHOPPING_BUILT_IN_CATEGORY_LABELS.pl[key].length > 0, true);
      assert.notEqual(
        SHOPPING_BUILT_IN_CATEGORY_LABELS.en[key],
        SHOPPING_BUILT_IN_CATEGORY_LABELS.pl[key],
      );
    }

    assert.equal(ids.size, SHOPPING_BUILT_IN_CATEGORY_KEYS.length);
    assert.equal(SHOPPING_OTHER_CATEGORY_ID, SHOPPING_BUILT_IN_CATEGORY_IDS.other);
  });

  it('accepts a built-in response only when its id and labels match the catalog', () => {
    const parsedCategory = shoppingCategorySchema.safeParse({
      id: SHOPPING_BUILT_IN_CATEGORY_IDS.other,
      kind: 'built_in',
      builtInKey: 'other',
      name: null,
      labels: {
        en: SHOPPING_BUILT_IN_CATEGORY_LABELS.en.other,
        pl: SHOPPING_BUILT_IN_CATEGORY_LABELS.pl.other,
      },
      createdAt: '2026-10-25T12:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    });
    const mismatchedCategory = shoppingCategorySchema.safeParse({
      id: SHOPPING_BUILT_IN_CATEGORY_IDS.bakery,
      kind: 'built_in',
      builtInKey: 'other',
      name: null,
      labels: {
        en: SHOPPING_BUILT_IN_CATEGORY_LABELS.en.other,
        pl: SHOPPING_BUILT_IN_CATEGORY_LABELS.pl.other,
      },
      createdAt: '2026-10-25T12:00:00.000Z',
      updatedAt: '2026-10-25T12:00:00.000Z',
    });

    assert.equal(parsedCategory.success, true);
    assert.equal(mismatchedCategory.success, false);
  });
});
