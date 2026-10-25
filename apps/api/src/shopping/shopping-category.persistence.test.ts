import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import {
  SHOPPING_BUILT_IN_CATEGORY_IDS,
  SHOPPING_BUILT_IN_CATEGORY_KEYS,
  SHOPPING_BUILT_IN_CATEGORY_LABELS,
  SHOPPING_CATEGORY_NAME_MAX_LENGTH,
  SHOPPING_OTHER_CATEGORY_ID,
  type ShoppingBuiltInCategoryKey,
} from '@nestra/contracts';
import { Client } from 'pg';
import { DataSource, QueryFailedError } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { createDatabaseOptions } from '../database/database-options';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingCategoriesService } from './shopping-categories.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const TEST_DATABASE_NAME = 'nestra_shopping_category_test';

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

async function createTestDataSource(databaseName: string): Promise<DataSource> {
  const adminDatabaseUrl = resolveAdminDatabaseUrl();
  await recreateDatabase(adminDatabaseUrl, databaseName);
  const dataSource = new DataSource(
    createDatabaseOptions(buildDatabaseUrl(adminDatabaseUrl, databaseName)),
  );
  await dataSource.initialize();
  return dataSource;
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

function assertBuiltInCatalog(
  categories: readonly {
    readonly id: string;
    readonly kind: string;
    readonly builtInKey: ShoppingBuiltInCategoryKey | null;
    readonly name: string | null;
    readonly labels: { readonly en: string; readonly pl: string } | null;
  }[],
): void {
  assert.equal(categories.length >= SHOPPING_BUILT_IN_CATEGORY_KEYS.length, true);

  for (const [position, key] of SHOPPING_BUILT_IN_CATEGORY_KEYS.entries()) {
    const category = categories[position];
    assert.ok(category !== undefined);
    assert.equal(category.kind, 'built_in');
    assert.equal(category.builtInKey, key);
    assert.equal(category.id, SHOPPING_BUILT_IN_CATEGORY_IDS[key]);
    assert.equal(category.name, null);
    assert.deepEqual(category.labels, {
      en: SHOPPING_BUILT_IN_CATEGORY_LABELS.en[key],
      pl: SHOPPING_BUILT_IN_CATEGORY_LABELS.pl[key],
    });
  }
}

describe('shopping category persistence', { concurrency: false }, () => {
  let dataSource: DataSource | undefined;
  let shoppingCategoriesService: ShoppingCategoriesService | undefined;

  before(async () => {
    if (!(await isPostgresAvailable(resolveAdminDatabaseUrl()))) {
      return;
    }

    dataSource = await createTestDataSource(TEST_DATABASE_NAME);
    await dataSource.runMigrations();
    shoppingCategoriesService = new ShoppingCategoriesService(
      dataSource.getRepository(ShoppingCategoryEntity),
      new DatabaseConnectionService(dataSource),
      dataSource,
    );
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('seeds stable built-in categories and refuses to mutate them in SQL', async (testContext) => {
    if (dataSource === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const builtInCategories = await dataSource.query<
      Array<{ id: string; built_in_key: string; built_in_position: number }>
    >(
      `
        SELECT id, built_in_key, built_in_position
        FROM shopping_categories
        WHERE kind = 'built_in'
        ORDER BY built_in_position ASC
      `,
    );

    assert.deepEqual(
      builtInCategories.map((category) => category.built_in_key),
      [...SHOPPING_BUILT_IN_CATEGORY_KEYS],
    );
    assert.deepEqual(
      builtInCategories.map((category) => category.id),
      SHOPPING_BUILT_IN_CATEGORY_KEYS.map((key) => SHOPPING_BUILT_IN_CATEGORY_IDS[key]),
    );

    await assert.rejects(
      dataSource.query('DELETE FROM shopping_categories WHERE id = $1', [
        SHOPPING_OTHER_CATEGORY_ID,
      ]),
      (error: unknown) => {
        assert.ok(error instanceof QueryFailedError);
        assert.equal(readPostgresErrorCode(error), '23514');
        return true;
      },
    );
    await assert.rejects(
      dataSource.query(`UPDATE shopping_categories SET built_in_key = 'renamed' WHERE id = $1`, [
        SHOPPING_BUILT_IN_CATEGORY_IDS.bakery,
      ]),
      (error: unknown) => {
        assert.ok(error instanceof QueryFailedError);
        assert.equal(readPostgresErrorCode(error), '23514');
        return true;
      },
    );
    await assert.rejects(
      dataSource.query(
        `INSERT INTO shopping_categories (kind, name, name_key) VALUES ('custom', 'Snacks', 'snacks')`,
      ),
      (error: unknown) => {
        assert.ok(error instanceof QueryFailedError);
        assert.equal(readPostgresErrorCode(error), '23514');
        return true;
      },
    );
  });

  it('lists built-in labels for the caller and hides another user custom category', async (testContext) => {
    if (dataSource === undefined || shoppingCategoriesService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const customCategory = await shoppingCategoriesService.createCategory(
      ownerId,
      '  Fresh   herbs ',
    );
    const ownerCategories = await shoppingCategoriesService.listCategories(ownerId);
    const otherCategories = await shoppingCategoriesService.listCategories(otherUserId);

    assertBuiltInCatalog(ownerCategories);
    assert.equal(ownerCategories.at(-1)?.id, customCategory.id);
    assert.equal(ownerCategories.at(-1)?.kind, 'custom');
    assert.equal(ownerCategories.at(-1)?.name, 'Fresh herbs');
    assert.equal(
      otherCategories.some((category) => category.id === customCategory.id),
      false,
    );
  });

  it('merges custom names by comparison key and keeps ownership isolated', async (testContext) => {
    if (dataSource === undefined || shoppingCategoriesService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    await shoppingCategoriesService.createCategory(ownerId, 'Rice');

    await assert.rejects(
      shoppingCategoriesService.createCategory(ownerId, ' RICE '),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_NAME_ALREADY_EXISTS', 409);
        return true;
      },
    );

    const otherCategory = await shoppingCategoriesService.createCategory(otherUserId, 'rice');
    assert.equal(otherCategory.name, 'rice');
    assert.equal(otherCategory.kind, 'custom');

    const expandedDisplayName = `\u0130${'a'.repeat(SHOPPING_CATEGORY_NAME_MAX_LENGTH - 1)}`;
    const expandedCategory = await shoppingCategoriesService.createCategory(
      ownerId,
      expandedDisplayName,
    );
    assert.equal(expandedCategory.name, expandedDisplayName);
  });

  it('renames a custom category without changing its id and rejects built-in changes', async (testContext) => {
    if (dataSource === undefined || shoppingCategoriesService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const createdCategory = await shoppingCategoriesService.createCategory(ownerId, 'Snacks');
    const renamedCategory = await shoppingCategoriesService.renameCategory(
      ownerId,
      createdCategory.id,
      '  Party   snacks ',
    );

    assert.equal(renamedCategory.id, createdCategory.id);
    assert.equal(renamedCategory.name, 'Party snacks');
    assert.equal(renamedCategory.kind, 'custom');

    await shoppingCategoriesService.createCategory(ownerId, 'Bakery counter');
    await assert.rejects(
      shoppingCategoriesService.renameCategory(ownerId, renamedCategory.id, 'bakery counter'),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_NAME_ALREADY_EXISTS', 409);
        return true;
      },
    );
    await assert.rejects(
      shoppingCategoriesService.renameCategory(ownerId, SHOPPING_OTHER_CATEGORY_ID, 'Misc'),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_BUILT_IN', 409);
        return true;
      },
    );
    await assert.rejects(
      shoppingCategoriesService.renameCategory(otherUserId, createdCategory.id, 'Taken'),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('deletes only an owned custom category and keeps Other permanent', async (testContext) => {
    if (dataSource === undefined || shoppingCategoriesService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const createdCategory = await shoppingCategoriesService.createCategory(ownerId, 'Spices');

    await assert.rejects(
      shoppingCategoriesService.deleteCategory(ownerId, SHOPPING_OTHER_CATEGORY_ID),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_BUILT_IN', 409);
        return true;
      },
    );
    await assert.rejects(
      shoppingCategoriesService.deleteCategory(otherUserId, createdCategory.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_NOT_FOUND', 404);
        return true;
      },
    );

    await shoppingCategoriesService.deleteCategory(ownerId, createdCategory.id);
    const categories = await shoppingCategoriesService.listCategories(ownerId);
    assert.equal(
      categories.some((category) => category.id === createdCategory.id),
      false,
    );
    assert.equal(
      categories.some((category) => category.id === SHOPPING_OTHER_CATEGORY_ID),
      true,
    );
  });

  it('removes custom categories with the owning user and leaves built-in rows', async (testContext) => {
    if (dataSource === undefined || shoppingCategoriesService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const createdCategory = await shoppingCategoriesService.createCategory(ownerId, 'Pet food');

    await dataSource.query('DELETE FROM users WHERE id = $1', [ownerId]);

    const remainingCustomCategory = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM shopping_categories WHERE id = $1',
      [createdCategory.id],
    );
    const builtInCount = await dataSource.query<Array<{ count: string }>>(
      `SELECT count(*)::text AS count FROM shopping_categories WHERE kind = 'built_in'`,
    );

    assert.deepEqual(remainingCustomCategory, []);
    assert.equal(builtInCount[0]?.count, String(SHOPPING_BUILT_IN_CATEGORY_KEYS.length));
  });
});

function readPostgresErrorCode(error: QueryFailedError): string | undefined {
  const driverError = error.driverError;

  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return undefined;
  }

  return typeof driverError.code === 'string' ? driverError.code : undefined;
}
