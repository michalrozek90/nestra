import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import {
  SHOPPING_BUILT_IN_CATEGORY_IDS,
  SHOPPING_OTHER_CATEGORY_ID,
  type ShoppingProduct,
} from '@nestra/contracts';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { createDatabaseOptions } from '../database/database-options';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingProductsService } from './shopping-products.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const TEST_DATABASE_NAME = 'nestra_shopping_product_test';

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

function requireProduct(products: readonly ShoppingProduct[], productId: string): ShoppingProduct {
  const product = products.find((candidate) => candidate.id === productId);
  assert.ok(product !== undefined);
  return product;
}

describe('shopping product persistence', { concurrency: false }, () => {
  let dataSource: DataSource | undefined;
  let shoppingProductsService: ShoppingProductsService | undefined;
  let shoppingCategoriesService: ShoppingCategoriesService | undefined;

  before(async () => {
    if (!(await isPostgresAvailable(resolveAdminDatabaseUrl()))) {
      return;
    }

    dataSource = await createTestDataSource(TEST_DATABASE_NAME);
    await dataSource.runMigrations();
    const databaseConnectionService = new DatabaseConnectionService(dataSource);
    shoppingProductsService = new ShoppingProductsService(
      dataSource.getRepository(ShoppingProductEntity),
      dataSource.getRepository(ShoppingCategoryEntity),
      databaseConnectionService,
      dataSource,
    );
    shoppingCategoriesService = new ShoppingCategoriesService(
      dataSource.getRepository(ShoppingCategoryEntity),
      databaseConnectionService,
      dataSource,
    );
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('remembers one normalized product per user and hides it from other users', async (testContext) => {
    if (dataSource === undefined || shoppingProductsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);

    const createdProduct = await shoppingProductsService.createProduct(
      ownerId,
      '  Jajka   12   sztuk ',
      undefined,
    );
    assert.equal(createdProduct.name, 'Jajka 12 sztuk');
    assert.equal(createdProduct.categoryId, SHOPPING_OTHER_CATEGORY_ID);
    assert.equal(createdProduct.usageCount, 0);
    assert.equal(createdProduct.lastUsedAt, null);

    await assert.rejects(
      shoppingProductsService.createProduct(ownerId, 'JAJKA 12 sztuk', undefined),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRODUCT_NAME_ALREADY_EXISTS', 409);
        return true;
      },
    );

    const otherProduct = await shoppingProductsService.createProduct(
      otherUserId,
      'Jajka 12 sztuk',
      SHOPPING_BUILT_IN_CATEGORY_IDS.dairy,
    );
    const ownerProducts = await shoppingProductsService.listProducts(ownerId);
    assert.equal(
      ownerProducts.some((product) => product.id === otherProduct.id),
      false,
    );
    assert.equal(otherProduct.categoryId, SHOPPING_BUILT_IN_CATEGORY_IDS.dairy);

    const otherCategory = await shoppingCategoriesService?.createCategory(otherUserId, 'Private');
    assert.ok(otherCategory !== undefined);
    await assert.rejects(
      shoppingProductsService.createProduct(ownerId, 'Cynamon', otherCategory.id),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_CATEGORY_NOT_FOUND', 404);
        return true;
      },
    );

    const expandedName = '\u0130'.repeat(30);
    const expandedProduct = await shoppingProductsService.createProduct(
      ownerId,
      expandedName,
      undefined,
    );
    assert.equal(expandedProduct.name, expandedName);
  });

  it('does not record usage for catalog edits and counts each list addition once', async (testContext) => {
    if (dataSource === undefined || shoppingProductsService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    const otherUserId = randomUUID();
    await insertUser(dataSource, ownerId);
    await insertUser(dataSource, otherUserId);
    const customCategory = await shoppingCategoriesService?.createCategory(ownerId, 'Spices');
    assert.ok(customCategory !== undefined);

    const createdProduct = await shoppingProductsService.createProduct(
      ownerId,
      'Pieprz',
      undefined,
    );
    const renamedProduct = await shoppingProductsService.updateProduct(ownerId, createdProduct.id, {
      name: 'Pieprz czarny',
      categoryId: customCategory.id,
    });
    assert.equal(renamedProduct.usageCount, 0);
    assert.equal(renamedProduct.lastUsedAt, null);
    assert.equal(renamedProduct.categoryId, customCategory.id);

    const usedAt = new Date('2026-10-25T12:00:00.000Z');
    const usedProduct = await shoppingProductsService.recordShoppingListUsage(
      ownerId,
      createdProduct.id,
      usedAt,
    );
    assert.equal(usedProduct.usageCount, 1);
    assert.equal(usedProduct.lastUsedAt, usedAt.toISOString());

    await Promise.all([
      shoppingProductsService.recordShoppingListUsage(ownerId, createdProduct.id, usedAt),
      shoppingProductsService.recordShoppingListUsage(ownerId, createdProduct.id, usedAt),
    ]);
    const products = await shoppingProductsService.listProducts(ownerId);
    assert.equal(requireProduct(products, createdProduct.id).usageCount, 3);

    await assert.rejects(
      shoppingProductsService.updateProduct(otherUserId, createdProduct.id, {
        categoryId: SHOPPING_OTHER_CATEGORY_ID,
      }),
      (error: unknown) => {
        assertApiException(error, 'SHOPPING_PRODUCT_NOT_FOUND', 404);
        return true;
      },
    );
  });

  it('moves products to Other when their custom category is deleted', async (testContext) => {
    if (
      dataSource === undefined ||
      shoppingProductsService === undefined ||
      shoppingCategoriesService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const ownerId = randomUUID();
    await insertUser(dataSource, ownerId);
    const customCategory = await shoppingCategoriesService.createCategory(
      ownerId,
      'Bakery counter',
    );
    const createdProduct = await shoppingProductsService.createProduct(
      ownerId,
      'Bulka',
      customCategory.id,
    );

    await shoppingCategoriesService.deleteCategory(ownerId, customCategory.id);
    const products = await shoppingProductsService.listProducts(ownerId);
    assert.equal(
      requireProduct(products, createdProduct.id).categoryId,
      SHOPPING_OTHER_CATEGORY_ID,
    );

    const triggerCategory = await shoppingCategoriesService.createCategory(ownerId, 'Counter');
    const triggerProduct = await shoppingProductsService.createProduct(
      ownerId,
      'Kajzerka',
      triggerCategory.id,
    );
    await dataSource.query('DELETE FROM shopping_categories WHERE id = $1', [triggerCategory.id]);
    const reassignedProducts = await shoppingProductsService.listProducts(ownerId);
    assert.equal(
      requireProduct(reassignedProducts, triggerProduct.id).categoryId,
      SHOPPING_OTHER_CATEGORY_ID,
    );

    await dataSource.query('DELETE FROM users WHERE id = $1', [ownerId]);
    const remainingProducts = await dataSource.query<Array<{ id: string }>>(
      'SELECT id FROM shopping_products WHERE id = $1',
      [createdProduct.id],
    );
    assert.deepEqual(remainingProducts, []);
  });
});
