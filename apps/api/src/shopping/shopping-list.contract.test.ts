import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addShoppingListItemSchema,
  SHOPPING_LIST_ITEM_LIMIT,
  SHOPPING_LIST_NAME_MAX_LENGTH,
  shoppingListNameSchema,
} from '@nestra/contracts';

describe('shopping list contracts', () => {
  it('normalizes a list name and rejects a name longer than 40 characters', () => {
    assert.equal(shoppingListNameSchema.parse('  Weekend   list '), 'Weekend list');
    assert.equal(
      shoppingListNameSchema.safeParse('a'.repeat(SHOPPING_LIST_NAME_MAX_LENGTH)).success,
      true,
    );
    assert.equal(
      shoppingListNameSchema.safeParse('a'.repeat(SHOPPING_LIST_NAME_MAX_LENGTH + 1)).success,
      false,
    );
  });

  it('accepts one product identity and a quantity that stays within 1 to 999', () => {
    assert.equal(addShoppingListItemSchema.safeParse({ name: 'Milk', quantity: 2 }).success, true);
    assert.equal(addShoppingListItemSchema.safeParse({}).success, false);
    assert.equal(
      addShoppingListItemSchema.safeParse({
        productId: '7a1e9c42-0d58-4b63-a2f4-6c8d1e5b9037',
        name: 'Milk',
      }).success,
      false,
    );
    assert.equal(
      addShoppingListItemSchema.safeParse({ name: 'Milk', quantity: 1000 }).success,
      false,
    );
    assert.equal(SHOPPING_LIST_ITEM_LIMIT, 250);
  });
});
