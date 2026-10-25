import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { SHOPPING_PRESET_ENTRY_LIMIT, SHOPPING_PRESET_LIMIT } from '@nestra/contracts';
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
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingPresetsService } from './shopping-presets.service';
import { ShoppingProductsService } from './shopping-products.service';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const TEST_DATABASE_NAME = 'nestra_shopping_preset_test';

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

describe('shopping preset persistence', { concurrency: false }, () => {
  let dataSource: DataSource | undefined;
  let shoppingCategoriesService: ShoppingCategoriesService | undefined;
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
    shoppingCategoriesService = new ShoppingCategoriesService(
      dataSource.getRepository(ShoppingCategoryEntity),
      databaseConnectionService,
      dataSource,
    );
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
    shoppingListsService = new ShoppingListsService(
      dataSource.getRepository(ShoppingListEntity),
      dataSource.getRepository(ShoppingListItemEntity),
      dataSource.getRepository(ShoppingProductEntity),
      shoppingProductsService,
      shoppingStoreProfilesService,
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
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('keeps a product snapshot private from lists and from other users', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingCategoriesService === undefined ||
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
    const milk = await shoppingProductsService.createProduct(ownerId, 'Milk', undefined);
    const bread = await shoppingProductsService.createProduct(ownerId, 'Bread', undefined);
    const foreignProduct = await shoppingProductsService.createProduct(
      otherUserId,
      'Milk',
      undefined,
    );
    const profile = await shoppingStoreProfilesService.createProfile(ownerId, '  Lidl   extra ');
    const createdPreset = await shoppingPresetsService.createPreset(ownerId, {
      name: '  Weekly   shop ',
      storeProfileId: profile.id,
      entries: [
        { productId: milk.id, quantity: 2 },
        { productId: bread.id, quantity: 1 },
      ],
    });
    assert.equal(createdPreset.name, 'Weekly shop');
    assert.equal(createdPreset.storeProfileId, profile.id);
    assert.deepEqual(
      createdPreset.entries.map((entry) => ({
        productId: entry.productId,
        quantity: entry.quantity,
        position: entry.position,
      })),
      [
        { productId: milk.id, quantity: 2, position: 0 },
        { productId: bread.id, quantity: 1, position: 1 },
      ],
    );
    const profiles = await shoppingStoreProfilesService.listProfiles(ownerId);
    assert.equal(profiles.lastSelectedProfileId, null);

    const list = await shoppingListsService.createList(ownerId, 'Saturday');
    const listed = await shoppingListsService.addItem(ownerId, list.id, {
      productId: milk.id,
      quantity: 9,
    });
    const presetAfterListEdit = await shoppingPresetsService.getPreset(ownerId, createdPreset.id);
    assert.equal(presetAfterListEdit.entries[0]?.quantity, 2);
    assert.equal(listed.items[0]?.quantity, 9);

    const replacedPreset = await shoppingPresetsService.replaceEntries(ownerId, createdPreset.id, {
      entries: [{ productId: bread.id, quantity: 4 }],
    });
    const listAfterPresetEdit = await shoppingListsService.getList(ownerId, list.id);
    assert.equal(replacedPreset.entries.length, 1);
    assert.equal(replacedPreset.entries[0]?.productId, bread.id);
    assert.equal(listAfterPresetEdit.items.length, 1);
    assert.equal(listAfterPresetEdit.items[0]?.productId, milk.id);
    assert.equal(listAfterPresetEdit.items[0]?.quantity, 9);

    const spices = await shoppingCategoriesService.createCategory(ownerId, 'Spices');
    await shoppingProductsService.updateProduct(ownerId, bread.id, {
      name: 'Sourdough',
      categoryId: spices.id,
    });
    const reflectedPreset = await shoppingPresetsService.getPreset(ownerId, createdPreset.id);
    assert.equal(reflectedPreset.entries[0]?.name, 'Sourdough');
    assert.equal(reflectedPreset.entries[0]?.categoryId, spices.id);

    await shoppingStoreProfilesService.deleteProfile(ownerId, profile.id);
    const presetAfterProfileDelete = await shoppingPresetsService.getPreset(
      ownerId,
      createdPreset.id,
    );
    assert.equal(presetAfterProfileDelete.storeProfileId, null);
    assert.equal(presetAfterProfileDelete.entries.length, 1);

    assert.deepEqual(await shoppingPresetsService.listPresets(otherUserId), []);
    await assert.rejects(
      shoppingPresetsService.getPreset(otherUserId, createdPreset.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRESET_NOT_FOUND', 404);
        return true;
      },
    );
    await assert.rejects(
      shoppingPresetsService.createPreset(ownerId, {
        name: 'Foreign',
        entries: [{ productId: foreignProduct.id, quantity: 1 }],
      }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRODUCT_NOT_FOUND', 404);
        return true;
      },
    );
    const renamedPreset = await shoppingPresetsService.updatePreset(ownerId, createdPreset.id, {
      name: '  Sunday   shop ',
    });
    assert.equal(renamedPreset.name, 'Sunday shop');
    assert.equal(renamedPreset.entries.length, 1);
    const summaries = await shoppingPresetsService.listPresets(ownerId);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0]?.entryCount, 1);

    await shoppingPresetsService.deletePreset(ownerId, createdPreset.id);
    assert.deepEqual(await shoppingPresetsService.listPresets(ownerId), []);
    await assert.rejects(
      shoppingPresetsService.getPreset(ownerId, createdPreset.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRESET_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('enforces the preset and entry limits without dropping a saved snapshot', async (testContext) => {
    if (shoppingPresetsService === undefined || shoppingProductsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    if (dataSource === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    await insertUser(dataSource, ownerId);
    const firstProduct = await shoppingProductsService.createProduct(ownerId, 'Eggs', undefined);
    const savedPreset = await shoppingPresetsService.createPreset(ownerId, {
      name: 'Limit',
      entries: [{ productId: firstProduct.id, quantity: 1 }],
    });

    for (let index = 1; index < SHOPPING_PRESET_LIMIT; index += 1) {
      await shoppingPresetsService.createPreset(ownerId, { name: `Preset ${index}` });
    }

    await assert.rejects(
      shoppingPresetsService.createPreset(ownerId, { name: 'One too many' }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRESET_LIMIT_REACHED', 409);
        return true;
      },
    );

    const products = [firstProduct];

    for (let index = 1; index <= SHOPPING_PRESET_ENTRY_LIMIT; index += 1) {
      products.push(
        await shoppingProductsService.createProduct(ownerId, `Item ${index}`, undefined),
      );
    }

    await assert.rejects(
      shoppingPresetsService.replaceEntries(ownerId, savedPreset.id, {
        entries: products.map((product) => ({ productId: product.id, quantity: 1 })),
      }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRESET_ENTRY_LIMIT_REACHED', 409);
        return true;
      },
    );
    const unchangedPreset = await shoppingPresetsService.getPreset(ownerId, savedPreset.id);
    assert.equal(unchangedPreset.entries.length, 1);
    assert.equal(unchangedPreset.entries[0]?.productId, firstProduct.id);
    const filledPreset = await shoppingPresetsService.replaceEntries(ownerId, savedPreset.id, {
      entries: products.slice(0, SHOPPING_PRESET_ENTRY_LIMIT).map((product) => ({
        productId: product.id,
        quantity: 1,
      })),
    });
    assert.equal(filledPreset.entries.length, SHOPPING_PRESET_ENTRY_LIMIT);

    await assert.rejects(
      shoppingPresetsService.replaceEntries(ownerId, savedPreset.id, {
        entries: [
          { productId: firstProduct.id, quantity: 1 },
          { productId: firstProduct.id, quantity: 2 },
        ],
      }),
      (error: unknown) => {
        assertApiException(error, 'VALIDATION_FAILED', 400);
        return true;
      },
    );
  });
});
