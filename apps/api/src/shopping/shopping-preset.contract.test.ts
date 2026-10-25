import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createShoppingPresetSchema,
  replaceShoppingPresetEntriesSchema,
  SHOPPING_PRESET_ENTRY_LIMIT,
  SHOPPING_PRESET_LIMIT,
  SHOPPING_PRESET_NAME_MAX_LENGTH,
  shoppingPresetNameSchema,
  updateShoppingPresetSchema,
} from '@nestra/contracts';

const PRODUCT_ID = '6b1c2d30-4e5f-4a67-8b90-1c2d3e4f5a6b';

describe('shopping preset contracts', () => {
  it('normalizes a preset name and rejects a name longer than 30 characters', () => {
    assert.equal(shoppingPresetNameSchema.parse('  Weekly   shop '), 'Weekly shop');
    assert.equal(SHOPPING_PRESET_LIMIT, 20);
    assert.equal(SHOPPING_PRESET_ENTRY_LIMIT, 150);
    assert.equal(
      shoppingPresetNameSchema.safeParse('a'.repeat(SHOPPING_PRESET_NAME_MAX_LENGTH)).success,
      true,
    );
    assert.equal(
      shoppingPresetNameSchema.safeParse('a'.repeat(SHOPPING_PRESET_NAME_MAX_LENGTH + 1)).success,
      false,
    );
  });

  it('accepts a quantity from 1 to 999 and requires a preset edit to change something', () => {
    assert.equal(
      createShoppingPresetSchema.safeParse({
        name: 'Weekly',
        entries: [{ productId: PRODUCT_ID, quantity: 1 }],
      }).success,
      true,
    );
    assert.equal(
      replaceShoppingPresetEntriesSchema.safeParse({
        entries: [{ productId: PRODUCT_ID, quantity: 999 }],
      }).success,
      true,
    );
    assert.equal(
      replaceShoppingPresetEntriesSchema.safeParse({
        entries: [{ productId: PRODUCT_ID, quantity: 1000 }],
      }).success,
      false,
    );
    assert.equal(updateShoppingPresetSchema.safeParse({ storeProfileId: null }).success, true);
    assert.equal(updateShoppingPresetSchema.safeParse({}).success, false);
  });
});
