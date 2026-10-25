import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  nextShoppingListUsage,
  SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
  SHOPPING_PRODUCT_NAME_MAX_LENGTH,
  shoppingProductNameSchema,
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
});
