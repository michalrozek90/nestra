import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { SHOPPING_BUILT_IN_CATEGORY_IDS, SHOPPING_OTHER_CATEGORY_ID } from '@nestra/contracts';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { createDatabaseOptions } from '../database/database-options';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingPresetEntryEntity } from './entities/shopping-preset-entry.entity';
import { ShoppingPresetEntity } from './entities/shopping-preset.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingStorePreferenceEntity } from './entities/shopping-store-preference.entity';
import { ShoppingStoreProfileCategoryEntity } from './entities/shopping-store-profile-category.entity';
import { ShoppingStoreProfileEntity } from './entities/shopping-store-profile.entity';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingPresetsService } from './shopping-presets.service';
import { ShoppingProductsService } from './shopping-products.service';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const TEST_DATABASE_NAME = 'nestra_shopping_list_test';

function resolveAdminDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_ADMIN_URL ?? process.env.DATABASE_URL ?? DEFAULT_ADMIN_DATABASE_URL
  );
}

function buildDatabaseUrl(adminDatabaseUrl: string, databaseName: string): string {
  const parsedDatabaseUrl = new URL(adminDatabaseUrl);
  parsedDatabaseUrl.pathname = `/${databaseName}`;
  return parsedDatabaseUrl.toString();
}

async function recreateDatabase(adminDatabaseUrl: string, databaseName: string): Promise<void> {
  const client = new Client({ connectionString: adminDatabaseUrl });
  await client.connect();

  try {
    const existingDatabase = await client.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [databaseName],
    );

    if (existingDatabase.rows[0]?.exists === true) {
      await client.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `,
        [databaseName],
      );
      await client.query(`DROP DATABASE ${databaseName}`);
    }

    await client.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await client.end();
  }
}

async function isPostgresAvailable(adminDatabaseUrl: string): Promise<boolean> {
  const client = new Client({ connectionString: adminDatabaseUrl });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function insertUser(dataSource: DataSource, userId: string): Promise<void> {
  await dataSource.query('INSERT INTO users (id, email) VALUES ($1, $2)', [
    userId,
    `${userId}@example.com`,
  ]);
}

function assertApiException(error: unknown, errorCode: string, statusCode: number): void {
  assert.ok(error instanceof ApiException);
  assert.equal(error.errorCode, errorCode);
  assert.equal(error.getStatus(), statusCode);
}

describe('shopping list persistence', { concurrency: false }, () => {
  let dataSource: DataSource | undefined;
  let shoppingListsService: ShoppingListsService | undefined;
  let shoppingPresetsService: ShoppingPresetsService | undefined;
  let shoppingProductsService: ShoppingProductsService | undefined;
  let shoppingStoreProfilesService: ShoppingStoreProfilesService | undefined;

  before(async () => {
    if (!(await isPostgresAvailable(resolveAdminDatabaseUrl()))) {
      return;
    }

    const adminDatabaseUrl = resolveAdminDatabaseUrl();
    await recreateDatabase(adminDatabaseUrl, TEST_DATABASE_NAME);
    dataSource = new DataSource(
      createDatabaseOptions(buildDatabaseUrl(adminDatabaseUrl, TEST_DATABASE_NAME)),
    );
    await dataSource.initialize();
    await dataSource.runMigrations();
    const databaseConnectionService = new DatabaseConnectionService(dataSource);
    shoppingProductsService = new ShoppingProductsService(
      dataSource.getRepository(ShoppingProductEntity),
      dataSource.getRepository(ShoppingCategoryEntity),
      databaseConnectionService,
      dataSource,
    );
    shoppingStoreProfilesService = new ShoppingStoreProfilesService(
      dataSource.getRepository(ShoppingStoreProfileEntity),
      dataSource.getRepository(ShoppingStoreProfileCategoryEntity),
      dataSource.getRepository(ShoppingStorePreferenceEntity),
      databaseConnectionService,
      dataSource,
    );
    shoppingPresetsService = new ShoppingPresetsService(
      dataSource.getRepository(ShoppingPresetEntity),
      dataSource.getRepository(ShoppingPresetEntryEntity),
      dataSource.getRepository(ShoppingProductEntity),
      shoppingStoreProfilesService,
      databaseConnectionService,
      dataSource,
    );
    shoppingListsService = new ShoppingListsService(
      dataSource.getRepository(ShoppingListEntity),
      dataSource.getRepository(ShoppingListItemEntity),
      dataSource.getRepository(ShoppingProductEntity),
      shoppingProductsService,
      shoppingStoreProfilesService,
      databaseConnectionService,
      dataSource,
    );
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('keeps an empty list private and reusable', async (testContext) => {
    if (dataSource === undefined || shoppingListsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);

    const createdList = await shoppingListsService.createList(ownerId, '  Weekend   list ');
    assert.equal(createdList.name, 'Weekend list');
    assert.deepEqual(createdList.items, []);

    const renamedList = await shoppingListsService.renameList(
      ownerId,
      createdList.id,
      'Weekday list',
    );
    assert.equal(renamedList.name, 'Weekday list');
    assert.deepEqual(renamedList.items, []);

    const ownerLists = await shoppingListsService.listLists(ownerId);
    assert.equal(ownerLists.length, 1);
    assert.equal(ownerLists[0]?.itemCount, 0);
    assert.deepEqual(await shoppingListsService.listLists(otherUserId), []);

    await assert.rejects(
      shoppingListsService.getList(otherUserId, createdList.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('merges a repeated product by quantity and records one usage per addition', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingProductsService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const createdList = await shoppingListsService.createList(ownerId, 'Groceries');
    const firstAdd = await shoppingListsService.addItem(ownerId, createdList.id, {
      name: '  Jajka   12   sztuk ',
      quantity: 4,
    });
    assert.equal(firstAdd.items.length, 1);
    assert.equal(firstAdd.items[0]?.name, 'Jajka 12 sztuk');
    assert.equal(firstAdd.items[0]?.quantity, 4);
    assert.equal(firstAdd.items[0]?.categoryId, SHOPPING_OTHER_CATEGORY_ID);
    assert.equal(firstAdd.items[0]?.position, 0);

    const mergedAdd = await shoppingListsService.addItem(ownerId, createdList.id, {
      name: 'JAJKA 12 sztuk',
      quantity: 2,
    });
    assert.equal(mergedAdd.items.length, 1);
    assert.equal(mergedAdd.items[0]?.id, firstAdd.items[0]?.id);
    assert.equal(mergedAdd.items[0]?.quantity, 6);
    assert.equal(mergedAdd.items[0]?.position, 0);

    const products = await shoppingProductsService.listProducts(ownerId);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.usageCount, 2);

    const renamedList = await shoppingListsService.renameList(ownerId, createdList.id, 'Sklep');
    const productsAfterRename = await shoppingProductsService.listProducts(ownerId);
    assert.equal(renamedList.items.length, 1);
    assert.equal(productsAfterRename[0]?.usageCount, 2);

    await assert.rejects(
      shoppingListsService.addItem(ownerId, createdList.id, {
        name: 'Jajka 12 sztuk',
        quantity: 994,
      }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_QUANTITY_EXCEEDED', 409);
        return true;
      },
    );
    const unchangedList = await shoppingListsService.getList(ownerId, createdList.id);
    assert.equal(unchangedList.items[0]?.quantity, 6);
    assert.equal((await shoppingProductsService.listProducts(ownerId))[0]?.usageCount, 2);

    await dataSource.query(
      `UPDATE shopping_lists SET updated_at = created_at - interval '1 day' WHERE id = $1`,
      [createdList.id],
    );
    const staleList = await shoppingListsService.getList(ownerId, createdList.id);
    const touchedList = await shoppingListsService.addItem(ownerId, createdList.id, {
      name: 'Mleko',
    });
    assert.notEqual(touchedList.updatedAt, staleList.updatedAt);
  });

  it('rejects a 251st product and still allows a quantity merge at the limit', async (testContext) => {
    if (dataSource === undefined || shoppingListsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const createdList = await shoppingListsService.createList(ownerId, 'Full list');
    const firstAdd = await shoppingListsService.addItem(ownerId, createdList.id, { name: 'Milk' });
    const milkProductId = firstAdd.items[0]?.productId;
    assert.ok(milkProductId !== undefined);

    await dataSource.query(
      `
        INSERT INTO shopping_products (user_id, category_id, name, name_key)
        SELECT $1, $2, 'Item ' || item_number, 'item ' || item_number
        FROM generate_series(1, 249) AS item_number
      `,
      [ownerId, SHOPPING_OTHER_CATEGORY_ID],
    );
    await dataSource.query(
      `
        INSERT INTO shopping_list_items (list_id, product_id, quantity, position)
        SELECT $1, id, 1, row_number() OVER (ORDER BY name_key)
        FROM shopping_products
        WHERE user_id = $2 AND name LIKE 'Item %'
      `,
      [createdList.id, ownerId],
    );

    await assert.rejects(
      shoppingListsService.addItem(ownerId, createdList.id, { name: 'Bread' }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_ITEM_LIMIT_REACHED', 409);
        return true;
      },
    );
    await assert.rejects(
      dataSource.query(
        `
          WITH extra_product AS (
            INSERT INTO shopping_products (user_id, category_id, name, name_key)
            VALUES ($2, $3, 'Extra', 'extra')
            RETURNING id
          )
          INSERT INTO shopping_list_items (list_id, product_id, quantity, position)
          SELECT $1, id, 1, 1000
          FROM extra_product
        `,
        [createdList.id, ownerId, SHOPPING_OTHER_CATEGORY_ID],
      ),
    );

    const mergedList = await shoppingListsService.addItem(ownerId, createdList.id, {
      productId: milkProductId,
      quantity: 3,
    });
    const milk = mergedList.items.find((item) => item.name === 'Milk');
    assert.equal(mergedList.items.length, 250);
    assert.equal(milk?.quantity, 4);
    assert.equal(milk?.position, 0);

    await shoppingListsService.deleteList(ownerId, createdList.id);
    const products = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM shopping_products WHERE id = $1',
      [milkProductId],
    );
    assert.equal(products.length, 1);

    await dataSource.query('DELETE FROM users WHERE id = $1', [ownerId]);
    const remainingLists = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM shopping_lists WHERE user_id = $1',
      [ownerId],
    );
    assert.deepEqual(remainingLists, []);
  });

  it('remembers one product when the same new name is added to two lists at once', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingProductsService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const firstList = await shoppingListsService.createList(ownerId, 'First');
    const secondList = await shoppingListsService.createList(ownerId, 'Second');

    await Promise.all([
      shoppingListsService.addItem(ownerId, firstList.id, { name: 'Shared product' }),
      shoppingListsService.addItem(ownerId, secondList.id, { name: 'shared   product' }),
    ]);

    const products = await shoppingProductsService.listProducts(ownerId);
    assert.equal(products.length, 1);
    assert.equal(products[0]?.usageCount, 2);
    assert.equal((await shoppingListsService.getList(ownerId, firstList.id)).items.length, 1);
    assert.equal((await shoppingListsService.getList(ownerId, secondList.id)).items.length, 1);
  });

  it('edits one list row without renaming the catalog product or recording usage', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingPresetsService === undefined ||
      shoppingProductsService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const list = await shoppingListsService.createList(ownerId, 'Saturday');
    const otherList = await shoppingListsService.createList(ownerId, 'Sunday');
    const withMilk = await shoppingListsService.addItem(ownerId, list.id, {
      name: 'Milk',
      quantity: 2,
    });
    const milkItem = withMilk.items[0];
    assert.ok(milkItem !== undefined);
    const withBread = await shoppingListsService.addItem(ownerId, list.id, {
      name: 'Bread',
      quantity: 3,
    });
    const breadItem = withBread.items.find((item) => item.name === 'Bread');
    assert.ok(breadItem !== undefined);
    await shoppingListsService.addItem(ownerId, otherList.id, {
      productId: milkItem.productId,
      quantity: 1,
    });
    const preset = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Weekly',
      entries: [{ productId: milkItem.productId, quantity: 2 }],
    });

    const quantityChanged = await shoppingListsService.updateItem(ownerId, list.id, milkItem.id, {
      quantity: 5,
    });
    assert.equal(quantityChanged.items.find((item) => item.id === milkItem.id)?.quantity, 5);
    assert.equal(
      (await shoppingProductsService.listProducts(ownerId)).find(
        (product) => product.id === milkItem.productId,
      )?.usageCount,
      2,
    );

    const renamedOnList = await shoppingListsService.updateItem(ownerId, list.id, milkItem.id, {
      name: 'Oat milk',
    });
    const oatItem = renamedOnList.items.find((item) => item.name === 'Oat milk');
    assert.ok(oatItem !== undefined);
    assert.equal(oatItem.quantity, 5);
    assert.notEqual(oatItem.productId, milkItem.productId);
    assert.equal(renamedOnList.items.length, 2);
    const catalog = await shoppingProductsService.listProducts(ownerId);
    assert.equal(catalog.find((product) => product.id === milkItem.productId)?.name, 'Milk');
    assert.equal(catalog.find((product) => product.id === oatItem.productId)?.usageCount, 0);
    assert.equal(
      (await shoppingListsService.getList(ownerId, otherList.id)).items[0]?.name,
      'Milk',
    );
    assert.equal(
      (await shoppingPresetsService.getPreset(ownerId, preset.id)).entries[0]?.name,
      'Milk',
    );

    const merged = await shoppingListsService.updateItem(ownerId, list.id, oatItem.id, {
      name: 'Bread',
    });
    assert.equal(merged.items.length, 1);
    assert.equal(merged.items[0]?.productId, breadItem.productId);
    assert.equal(merged.items[0]?.quantity, 8);
    assert.equal(
      (await shoppingProductsService.listProducts(ownerId)).find(
        (product) => product.id === milkItem.productId,
      )?.usageCount,
      2,
    );

    const eggs = await shoppingListsService.addItem(ownerId, list.id, {
      name: 'Eggs',
      quantity: 500,
    });
    const eggsItem = eggs.items.find((item) => item.name === 'Eggs');
    assert.ok(eggsItem !== undefined);
    await shoppingListsService.updateItem(ownerId, list.id, breadItem.id, { quantity: 600 });
    await assert.rejects(
      shoppingListsService.updateItem(ownerId, list.id, eggsItem.id, { name: 'Bread' }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_QUANTITY_EXCEEDED', 409);
        return true;
      },
    );
    const unchanged = await shoppingListsService.getList(ownerId, list.id);
    assert.equal(unchanged.items.length, 2);
    assert.equal(unchanged.items.find((item) => item.id === eggsItem.id)?.quantity, 500);
    assert.equal(unchanged.items.find((item) => item.id === breadItem.id)?.quantity, 600);

    await shoppingListsService.removeItem(ownerId, list.id, eggsItem.id);
    const afterRemoval = await shoppingListsService.getList(ownerId, list.id);
    assert.equal(
      afterRemoval.items.some((item) => item.id === eggsItem.id),
      false,
    );
    assert.equal(
      (await shoppingProductsService.listProducts(ownerId)).some(
        (product) => product.id === eggsItem.productId,
      ),
      true,
    );
    await assert.rejects(
      shoppingListsService.removeItem(ownerId, list.id, eggsItem.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_ITEM_NOT_FOUND', 404);
        return true;
      },
    );
    await assert.rejects(
      shoppingListsService.updateItem(otherUserId, list.id, breadItem.id, { quantity: 1 }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('merges a renamed row at the 250-item limit without adding a row', async (testContext) => {
    if (dataSource === undefined || shoppingListsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const createdList = await shoppingListsService.createList(ownerId, 'Full list');
    const firstAdd = await shoppingListsService.addItem(ownerId, createdList.id, {
      name: 'Milk',
      quantity: 2,
    });
    const milkProductId = firstAdd.items[0]?.productId;
    assert.ok(milkProductId !== undefined);

    await dataSource.query(
      `
        INSERT INTO shopping_products (user_id, category_id, name, name_key)
        SELECT $1, $2, 'Item ' || item_number, 'item ' || item_number
        FROM generate_series(1, 249) AS item_number
      `,
      [ownerId, SHOPPING_OTHER_CATEGORY_ID],
    );
    await dataSource.query(
      `
        INSERT INTO shopping_list_items (list_id, product_id, quantity, position)
        SELECT $1, id, 4, row_number() OVER (ORDER BY name_key)
        FROM shopping_products
        WHERE user_id = $2 AND name LIKE 'Item %'
      `,
      [createdList.id, ownerId],
    );
    const fillerRows = await dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM shopping_list_items
        WHERE list_id = $1 AND product_id <> $2
        ORDER BY position
        LIMIT 1
      `,
      [createdList.id, milkProductId],
    );
    const fillerItemId = fillerRows[0]?.id;
    assert.ok(fillerItemId !== undefined);

    const mergedList = await shoppingListsService.updateItem(
      ownerId,
      createdList.id,
      fillerItemId,
      {
        name: 'Milk',
      },
    );
    const milk = mergedList.items.find((item) => item.productId === milkProductId);
    assert.equal(mergedList.items.length, 249);
    assert.equal(milk?.quantity, 6);
    assert.equal(
      mergedList.items.some((item) => item.id === fillerItemId),
      false,
    );
  });

  it('stacks presets atomically and keeps the list profile', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingPresetsService === undefined ||
      shoppingProductsService === undefined ||
      shoppingStoreProfilesService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const milk = await shoppingProductsService.createProduct(
      ownerId,
      'Milk',
      SHOPPING_BUILT_IN_CATEGORY_IDS.dairy,
    );
    const bread = await shoppingProductsService.createProduct(
      ownerId,
      'Bread',
      SHOPPING_BUILT_IN_CATEGORY_IDS.bakery,
    );
    const eggs = await shoppingProductsService.createProduct(
      ownerId,
      'Eggs',
      SHOPPING_BUILT_IN_CATEGORY_IDS.dairy,
    );
    const list = await shoppingListsService.createList(ownerId, 'Saturday');
    await shoppingListsService.addItem(ownerId, list.id, { productId: milk.id, quantity: 2 });
    const weekly = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Weekly',
      entries: [
        { productId: milk.id, quantity: 3 },
        { productId: bread.id, quantity: 1 },
      ],
    });
    const eggsPreset = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Breakfast',
      entries: [{ productId: eggs.id, quantity: 4 }],
    });
    const presetBefore = await shoppingPresetsService.getPreset(ownerId, weekly.id);

    const stacked = await shoppingListsService.applyPresets(ownerId, list.id, {
      presetIds: [weekly.id, weekly.id, eggsPreset.id],
    });
    assert.equal(stacked.storeProfileId, null);
    assert.deepEqual(
      stacked.items.map((item) => [item.productId, item.quantity, item.position]),
      [
        [milk.id, 8, 0],
        [bread.id, 2, 1],
        [eggs.id, 4, 2],
      ],
    );
    const usageAfterStack = await shoppingProductsService.listProducts(ownerId);
    assert.equal(usageAfterStack.find((product) => product.id === milk.id)?.usageCount, 3);
    assert.equal(usageAfterStack.find((product) => product.id === bread.id)?.usageCount, 2);
    assert.equal(usageAfterStack.find((product) => product.id === eggs.id)?.usageCount, 1);
    const presetAfter = await shoppingPresetsService.getPreset(ownerId, weekly.id);
    assert.equal(presetAfter.updatedAt, presetBefore.updatedAt);
    assert.deepEqual(
      presetAfter.entries.map((entry) => [entry.productId, entry.quantity, entry.position]),
      presetBefore.entries.map((entry) => [entry.productId, entry.quantity, entry.position]),
    );

    const milkItem = stacked.items.find((item) => item.productId === milk.id);
    assert.ok(milkItem !== undefined);
    await shoppingListsService.updateItem(ownerId, list.id, milkItem.id, { quantity: 997 });
    await assert.rejects(
      shoppingListsService.applyPresets(ownerId, list.id, { presetIds: [weekly.id] }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_QUANTITY_EXCEEDED', 409);
        return true;
      },
    );
    const unchanged = await shoppingListsService.getList(ownerId, list.id);
    assert.equal(unchanged.items.find((item) => item.productId === milk.id)?.quantity, 997);
    assert.equal(unchanged.items.find((item) => item.productId === bread.id)?.quantity, 2);
    assert.equal(
      (await shoppingProductsService.listProducts(ownerId)).find(
        (product) => product.id === milk.id,
      )?.usageCount,
      3,
    );

    const foreignPreset = await shoppingPresetsService.createPreset(otherUserId, {
      name: 'Foreign',
    });
    await assert.rejects(
      shoppingListsService.applyPresets(ownerId, list.id, { presetIds: [foreignPreset.id] }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRESET_NOT_FOUND', 404);
        return true;
      },
    );

    const listProfile = await shoppingStoreProfilesService.createProfile(ownerId, 'Local store');
    const presetProfile = await shoppingStoreProfilesService.createProfile(ownerId, 'Preset store');
    const storeList = await shoppingListsService.createList(ownerId, 'Store run');
    await shoppingListsService.updateList(ownerId, storeList.id, {
      storeProfileId: listProfile.id,
    });
    await shoppingListsService.addItem(ownerId, storeList.id, { productId: milk.id, quantity: 1 });
    const bakeryPreset = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Bakery stop',
      storeProfileId: presetProfile.id,
      entries: [{ productId: bread.id, quantity: 2 }],
    });
    const withBakery = await shoppingListsService.applyPresets(ownerId, storeList.id, {
      presetIds: [bakeryPreset.id],
    });
    assert.equal(withBakery.storeProfileId, listProfile.id);
    assert.deepEqual(
      withBakery.items.map((item) => item.productId),
      [bread.id, milk.id],
    );
    assert.equal(
      (await shoppingPresetsService.getPreset(ownerId, bakeryPreset.id)).storeProfileId,
      presetProfile.id,
    );

    const eggsOnStore = await shoppingListsService.applyPresets(ownerId, storeList.id, {
      presetIds: [eggsPreset.id],
    });
    assert.deepEqual(
      eggsOnStore.items.map((item) => [item.productId, item.position]),
      [
        [bread.id, 0],
        [milk.id, 1],
        [eggs.id, 2],
      ],
    );
  });

  it('rejects a preset that would add a 251st row without changing the list', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingPresetsService === undefined ||
      shoppingProductsService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const createdList = await shoppingListsService.createList(ownerId, 'Full list');
    const milk = await shoppingProductsService.createProduct(ownerId, 'Milk', undefined);
    const bread = await shoppingProductsService.createProduct(ownerId, 'Bread', undefined);
    await shoppingListsService.addItem(ownerId, createdList.id, {
      productId: milk.id,
      quantity: 1,
    });
    await dataSource.query(
      `
        INSERT INTO shopping_products (user_id, category_id, name, name_key)
        SELECT $1, $2, 'Item ' || item_number, 'item ' || item_number
        FROM generate_series(1, 249) AS item_number
      `,
      [ownerId, SHOPPING_OTHER_CATEGORY_ID],
    );
    await dataSource.query(
      `
        INSERT INTO shopping_list_items (list_id, product_id, quantity, position)
        SELECT $1, id, 1, row_number() OVER (ORDER BY name_key)
        FROM shopping_products
        WHERE user_id = $2 AND name LIKE 'Item %'
      `,
      [createdList.id, ownerId],
    );
    const extra = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Extra',
      entries: [{ productId: bread.id, quantity: 1 }],
    });
    const usageBefore = (await shoppingProductsService.listProducts(ownerId)).find(
      (product) => product.id === bread.id,
    )?.usageCount;

    await assert.rejects(
      shoppingListsService.applyPresets(ownerId, createdList.id, { presetIds: [extra.id] }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_LIST_ITEM_LIMIT_REACHED', 409);
        return true;
      },
    );
    const unchanged = await shoppingListsService.getList(ownerId, createdList.id);
    assert.equal(unchanged.items.length, 250);
    assert.equal(
      unchanged.items.some((item) => item.productId === bread.id),
      false,
    );
    assert.equal(
      (await shoppingProductsService.listProducts(ownerId)).find(
        (product) => product.id === bread.id,
      )?.usageCount,
      usageBefore,
    );

    const merged = await shoppingListsService.applyPresets(ownerId, createdList.id, {
      presetIds: [
        (
          await shoppingPresetsService.createPreset(ownerId, {
            name: 'More milk',
            entries: [{ productId: milk.id, quantity: 4 }],
          })
        ).id,
      ],
    });
    assert.equal(merged.items.length, 250);
    assert.equal(merged.items.find((item) => item.productId === milk.id)?.quantity, 5);
  });
});
