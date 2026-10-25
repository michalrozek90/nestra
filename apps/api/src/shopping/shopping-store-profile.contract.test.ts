import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  replaceShoppingStoreProfileOrderSchema,
  SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH,
  shoppingStoreProfileNameSchema,
  updateShoppingListSchema,
} from '@nestra/contracts';

describe('shopping store profile contracts', () => {
  it('normalizes a store name and rejects a name longer than 40 characters', () => {
    assert.equal(shoppingStoreProfileNameSchema.parse('  Lidl   extra '), 'Lidl extra');
    assert.equal(
      shoppingStoreProfileNameSchema.safeParse('a'.repeat(SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH))
        .success,
      true,
    );
    assert.equal(
      shoppingStoreProfileNameSchema.safeParse(
        'a'.repeat(SHOPPING_STORE_PROFILE_NAME_MAX_LENGTH + 1),
      ).success,
      false,
    );
  });

  it('requires a complete category order and allows a list to clear its profile', () => {
    assert.equal(
      replaceShoppingStoreProfileOrderSchema.safeParse({
        categoryIds: ['0e8a4d21-6c59-4b73-a047-5f1d9c3e8b62'],
      }).success,
      true,
    );
    assert.equal(
      replaceShoppingStoreProfileOrderSchema.safeParse({ categoryIds: [] }).success,
      false,
    );
    assert.equal(updateShoppingListSchema.safeParse({ storeProfileId: null }).success, true);
    assert.equal(updateShoppingListSchema.safeParse({}).success, false);
  });
});
