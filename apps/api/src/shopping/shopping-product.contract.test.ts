import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  nextShoppingListUsage,
  SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
  SHOPPING_PRODUCT_NAME_MAX_LENGTH,
  SHOPPING_OTHER_CATEGORY_ID,
  shoppingProductNameSchema,
  shoppingProductSchema,
  toShoppingComparisonKey,
  updateShoppingProductSchema,
} from '@nestra/contracts';

describe('shopping product contracts', () => {
  it('keeps the full typed name, including quantities written as text', () => {
    assert.equal(shoppingProductNameSchema.parse('  Jajka   12   sztuk '), 'Jajka 12 sztuk');
  });

  it('rejects blank and overlong product names', () => {
    assert.equal(shoppingProductNameSchema.safeParse('   ').success, false);
    assert.equal(
      shoppingProductNameSchema.safeParse('a'.repeat(SHOPPING_PRODUCT_NAME_MAX_LENGTH)).success,
      true,
    );
    assert.equal(
      shoppingProductNameSchema.safeParse('a'.repeat(SHOPPING_PRODUCT_NAME_MAX_LENGTH + 1)).success,
      false,
    );
  });

  it('keeps an expanded lowercase key inside the stored key limit', () => {
    const dottedCapitalI = '\u0130';
    const fullyExpandedName = dottedCapitalI.repeat(SHOPPING_PRODUCT_NAME_MAX_LENGTH);

    assert.equal(
      toShoppingComparisonKey(fullyExpandedName).length,
      SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
    );
  });

  it('counts one shopping-list addition and ignores an empty product update', () => {
    const usedAt = new Date('2026-10-25T12:00:00.000Z');
    const nextUsage = nextShoppingListUsage(2, usedAt);

    assert.equal(nextUsage.usageCount, 3);
    assert.equal(nextUsage.lastUsedAt, usedAt);
    assert.equal(updateShoppingProductSchema.safeParse({}).success, false);
  });

  it('requires an explicit archive timestamp on a remembered product', () => {
    const product = {
      id: '7a1e9c42-0d58-4b63-a2f4-6c8d1e5b9037',
      name: 'Milk',
      categoryId: SHOPPING_OTHER_CATEGORY_ID,
      usageCount: 0,
      lastUsedAt: null,
      archivedAt: null,
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z',
    };

    assert.equal(shoppingProductSchema.safeParse(product).success, true);
    const { archivedAt, ...withoutArchive } = product;
    assert.equal(archivedAt, null);
    assert.equal(shoppingProductSchema.safeParse(withoutArchive).success, false);
  });
});
