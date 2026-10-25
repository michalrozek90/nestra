import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import {
  SHOPPING_BUILT_IN_CATEGORY_IDS,
  SHOPPING_OTHER_CATEGORY_ID,
  type ShoppingStoreProfile,
} from '@nestra/contracts';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { createDatabaseOptions } from '../database/database-options';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingStorePreferenceEntity } from './entities/shopping-store-preference.entity';
import { ShoppingStoreProfileCategoryEntity } from './entities/shopping-store-profile-category.entity';
import { ShoppingStoreProfileEntity } from './entities/shopping-store-profile.entity';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingProductsService } from './shopping-products.service';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const TEST_DATABASE_NAME = 'nestra_shopping_store_profile_test';

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

function moveCategoryFirst(profile: ShoppingStoreProfile, categoryId: string): readonly string[] {
  return [categoryId, ...profile.categoryIds.filter((candidate) => candidate !== categoryId)];
}

describe('shopping store profile persistence', { concurrency: false }, () => {
  let dataSource: DataSource | undefined;
  let shoppingCategoriesService: ShoppingCategoriesService | undefined;
  let shoppingListsService: ShoppingListsService | undefined;
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
    const shoppingProductsService = new ShoppingProductsService(
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
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('keeps a deterministic category order and isolates profiles by owner', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingCategoriesService === undefined ||
      shoppingStoreProfilesService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const firstCategory = await shoppingCategoriesService.createCategory(ownerId, 'Spices');
    const createdProfile = await shoppingStoreProfilesService.createProfile(
      ownerId,
      '  Lidl   extra ',
    );
    assert.equal(createdProfile.name, 'Lidl extra');
    assert.equal(createdProfile.categoryIds.at(-1), firstCategory.id);
    assert.equal(createdProfile.categoryIds.at(-2), SHOPPING_BUILT_IN_CATEGORY_IDS.other);

    const secondCategory = await shoppingCategoriesService.createCategory(ownerId, 'Checkout');
    const appendedProfile = await shoppingStoreProfilesService.getProfile(
      ownerId,
      createdProfile.id,
    );
    assert.equal(appendedProfile.categoryIds.at(-1), secondCategory.id);

    const orderBeforeRename = appendedProfile.categoryIds;
    await shoppingCategoriesService.renameCategory(ownerId, secondCategory.id, 'Front checkout');
    const renamedProfile = await shoppingStoreProfilesService.getProfile(
      ownerId,
      createdProfile.id,
    );
    assert.deepEqual(renamedProfile.categoryIds, orderBeforeRename);

    const otherFirst = await shoppingStoreProfilesService.replaceOrder(ownerId, createdProfile.id, {
      categoryIds: [...moveCategoryFirst(renamedProfile, SHOPPING_OTHER_CATEGORY_ID)],
    });
    assert.equal(otherFirst.categoryIds[0], SHOPPING_OTHER_CATEGORY_ID);

    await shoppingCategoriesService.deleteCategory(ownerId, secondCategory.id);
    const withoutDeletedCategory = await shoppingStoreProfilesService.getProfile(
      ownerId,
      createdProfile.id,
    );
    assert.equal(withoutDeletedCategory.categoryIds.includes(secondCategory.id), false);
    assert.equal(withoutDeletedCategory.categoryIds[0], SHOPPING_OTHER_CATEGORY_ID);
    assert.equal(withoutDeletedCategory.categoryIds.length, otherFirst.categoryIds.length - 1);

    await assert.rejects(
      shoppingStoreProfilesService.replaceOrder(ownerId, createdProfile.id, {
        categoryIds: withoutDeletedCategory.categoryIds.slice(1),
      }),
      (error: unknown) => {
        assertApiException(error, 'VALIDATION_FAILED', 400);
        return true;
      },
    );
    assert.deepEqual(await shoppingStoreProfilesService.listProfiles(otherUserId), {
      lastSelectedProfileId: null,
      profiles: [],
    });
    await assert.rejects(
      shoppingStoreProfilesService.getProfile(otherUserId, createdProfile.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_STORE_PROFILE_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('records only an explicit profile selection and clears it on delete', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingListsService === undefined ||
      shoppingStoreProfilesService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const firstProfile = await shoppingStoreProfilesService.createProfile(ownerId, 'Lidl');
    const secondProfile = await shoppingStoreProfilesService.createProfile(ownerId, 'Biedronka');
    assert.equal(
      (await shoppingStoreProfilesService.listProfiles(ownerId)).lastSelectedProfileId,
      null,
    );

    await shoppingStoreProfilesService.getProfile(ownerId, firstProfile.id);
    await shoppingStoreProfilesService.renameProfile(ownerId, firstProfile.id, 'Lidl market');
    assert.equal(
      (await shoppingStoreProfilesService.listProfiles(ownerId)).lastSelectedProfileId,
      null,
    );

    const selected = await shoppingStoreProfilesService.selectProfile(ownerId, firstProfile.id);
    assert.equal(selected.lastSelectedProfileId, firstProfile.id);
    await shoppingStoreProfilesService.getProfile(ownerId, secondProfile.id);
    assert.equal(
      (await shoppingStoreProfilesService.listProfiles(ownerId)).lastSelectedProfileId,
      firstProfile.id,
    );

    const createdList = await shoppingListsService.createList(ownerId, 'Weekly');
    const assignedList = await shoppingListsService.updateList(ownerId, createdList.id, {
      storeProfileId: secondProfile.id,
    });
    assert.equal(assignedList.storeProfileId, secondProfile.id);
    assert.equal(
      (await shoppingStoreProfilesService.listProfiles(ownerId)).lastSelectedProfileId,
      secondProfile.id,
    );

    await shoppingListsService.renameList(ownerId, createdList.id, 'Weekly shop');
    await shoppingListsService.addItem(ownerId, createdList.id, { name: 'Milk', quantity: 2 });
    assert.equal(
      (await shoppingStoreProfilesService.listProfiles(ownerId)).lastSelectedProfileId,
      secondProfile.id,
    );

    await shoppingStoreProfilesService.deleteProfile(ownerId, secondProfile.id);
    const remainingList = await shoppingListsService.getList(ownerId, createdList.id);
    assert.equal(remainingList.name, 'Weekly shop');
    assert.equal(remainingList.storeProfileId, null);
    assert.equal(remainingList.items.length, 1);
    const remainingProfiles = await shoppingStoreProfilesService.listProfiles(ownerId);
    assert.equal(remainingProfiles.lastSelectedProfileId, null);
    assert.equal(remainingProfiles.profiles.length, 1);
    assert.equal(remainingProfiles.profiles[0]?.id, firstProfile.id);
  });
});
