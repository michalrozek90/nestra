import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  nextShoppingListUsage,
  SHOPPING_OTHER_CATEGORY_ID,
  SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
  shoppingProductNameSchema,
  toShoppingComparisonKey,
  type ShoppingProduct,
  type ShoppingProductList,
  type UpdateShoppingProduct,
} from '@nestra/contracts';
import { DataSource, QueryFailedError, type EntityManager, type Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { isShoppingProductNameConflict } from './shopping-product-name-conflict';

@Injectable()
export class ShoppingProductsService {
  constructor(
    @InjectRepository(ShoppingProductEntity)
    private readonly shoppingProductRepository: Repository<ShoppingProductEntity>,
    @InjectRepository(ShoppingCategoryEntity)
    private readonly shoppingCategoryRepository: Repository<ShoppingCategoryEntity>,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listProducts(userId: string): Promise<ShoppingProductList> {
    await this.databaseConnectionService.verifyConnection();
    const products = await this.shoppingProductRepository.find({
      where: { userId },
      order: { nameKey: 'ASC', id: 'ASC' },
    });

    return products.map((product) => this.toShoppingProduct(product));
  }

  async createProduct(
    userId: string,
    name: string,
    categoryId: string | undefined,
  ): Promise<ShoppingProduct> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parseProductName(name);
    const nameKey = this.parseProductNameKey(normalizedName);
    const resolvedCategoryId = categoryId ?? SHOPPING_OTHER_CATEGORY_ID;

    await this.findAssignableCategory(this.shoppingCategoryRepository, userId, resolvedCategoryId);

    try {
      const savedProduct = await this.shoppingProductRepository.save(
        this.shoppingProductRepository.create({
          userId,
          categoryId: resolvedCategoryId,
          name: normalizedName,
          nameKey,
          usageCount: 0,
          lastUsedAt: null,
        }),
      );

      return this.toShoppingProduct(savedProduct);
    } catch (error: unknown) {
      this.rethrowProductWriteError(error);
    }
  }

  async updateProduct(
    userId: string,
    productId: string,
    productInput: UpdateShoppingProduct,
  ): Promise<ShoppingProduct> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName =
      productInput.name === undefined ? undefined : this.parseProductName(productInput.name);
    const nameKey =
      normalizedName === undefined ? undefined : this.parseProductNameKey(normalizedName);

    return this.dataSource.transaction(async (entityManager) => {
      const productRepository = entityManager.getRepository(ShoppingProductEntity);
      const categoryRepository = entityManager.getRepository(ShoppingCategoryEntity);
      const product = await productRepository.findOne({
        where: { id: productId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (product === null) {
        throw this.createProductNotFoundException();
      }

      if (productInput.categoryId !== undefined) {
        await this.findAssignableCategory(categoryRepository, userId, productInput.categoryId);
        product.categoryId = productInput.categoryId;
      }

      if (normalizedName !== undefined && nameKey !== undefined) {
        product.name = normalizedName;
        product.nameKey = nameKey;
      }

      try {
        const savedProduct = await productRepository.save(product);
        return this.toShoppingProduct(savedProduct);
      } catch (error: unknown) {
        this.rethrowProductWriteError(error);
      }
    });
  }

  async recordShoppingListUsage(
    userId: string,
    productId: string,
    usedAt: Date,
  ): Promise<ShoppingProduct> {
    await this.databaseConnectionService.verifyConnection();

    return this.dataSource.transaction((entityManager) =>
      this.recordShoppingListUsageWithManager(entityManager, userId, productId, usedAt),
    );
  }

  async findOrRememberProduct(
    entityManager: EntityManager,
    userId: string,
    productInput: {
      readonly productId?: string;
      readonly name?: string;
      readonly categoryId?: string;
    },
  ): Promise<ShoppingProductEntity> {
    const productRepository = entityManager.getRepository(ShoppingProductEntity);

    if (productInput.productId !== undefined) {
      const ownedProduct = await productRepository.findOne({
        where: { id: productInput.productId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (ownedProduct === null) {
        throw this.createProductNotFoundException();
      }

      return ownedProduct;
    }

    if (productInput.name === undefined) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'A shopping-list product needs a remembered product id or a name.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedName = this.parseProductName(productInput.name);
    const nameKey = this.parseProductNameKey(normalizedName);
    const existingProduct = await productRepository.findOne({
      where: { userId, nameKey },
      lock: { mode: 'pessimistic_write' },
    });

    if (existingProduct !== null) {
      return existingProduct;
    }

    const categoryId = productInput.categoryId ?? SHOPPING_OTHER_CATEGORY_ID;
    await this.findAssignableCategory(
      entityManager.getRepository(ShoppingCategoryEntity),
      userId,
      categoryId,
    );

    // A unique violation aborts the surrounding list transaction, so conflict
    // handling has to stay inside this statement.
    const insertedProducts = await entityManager.query<Array<{ id: string }>>(
      `
        INSERT INTO shopping_products (user_id, category_id, name, name_key, usage_count, last_used_at)
        VALUES ($1, $2, $3, $4, 0, NULL)
        ON CONFLICT (user_id, name_key) DO NOTHING
        RETURNING id
      `,
      [userId, categoryId, normalizedName, nameKey],
    );
    const insertedProductId = insertedProducts[0]?.id;
    const rememberedProduct = await productRepository.findOne({
      where:
        insertedProductId === undefined ? { userId, nameKey } : { id: insertedProductId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (rememberedProduct === null) {
      throw new ApiException(
        'SHOPPING_PRODUCT_NAME_ALREADY_EXISTS',
        'A remembered product with this name already exists.',
        HttpStatus.CONFLICT,
      );
    }

    return rememberedProduct;
  }

  async recordShoppingListUsageWithManager(
    entityManager: EntityManager,
    userId: string,
    productId: string,
    usedAt: Date,
  ): Promise<ShoppingProduct> {
    const productRepository = entityManager.getRepository(ShoppingProductEntity);
    const product = await productRepository.findOne({
      where: { id: productId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (product === null) {
      throw this.createProductNotFoundException();
    }

    const nextUsage = nextShoppingListUsage(product.usageCount, usedAt);
    product.usageCount = nextUsage.usageCount;
    product.lastUsedAt = nextUsage.lastUsedAt;
    const savedProduct = await productRepository.save(product);
    return this.toShoppingProduct(savedProduct);
  }

  private async findAssignableCategory(
    repository: Repository<ShoppingCategoryEntity>,
    userId: string,
    categoryId: string,
  ): Promise<ShoppingCategoryEntity> {
    const category = await repository.findOne({ where: { id: categoryId } });

    if (category === null || (category.kind === 'custom' && category.userId !== userId)) {
      throw new ApiException(
        'SHOPPING_CATEGORY_NOT_FOUND',
        'The shopping category is missing or is not owned by the authenticated user.',
        HttpStatus.NOT_FOUND,
      );
    }

    return category;
  }

  private parseProductName(name: string): string {
    const parsedName = shoppingProductNameSchema.safeParse(name);

    if (!parsedName.success) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The shopping product name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedName.data;
  }

  private parseProductNameKey(normalizedName: string): string {
    const nameKey = toShoppingComparisonKey(normalizedName);

    if (nameKey.length > SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The shopping product name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return nameKey;
  }

  private rethrowProductWriteError(error: unknown): never {
    if (isShoppingProductNameConflict(error)) {
      throw new ApiException(
        'SHOPPING_PRODUCT_NAME_ALREADY_EXISTS',
        'A remembered product with this name already exists.',
        HttpStatus.CONFLICT,
      );
    }

    if (isShoppingProductCategoryForeignKeyViolation(error)) {
      throw new ApiException(
        'SHOPPING_CATEGORY_NOT_FOUND',
        'The shopping category is missing or is not owned by the authenticated user.',
        HttpStatus.NOT_FOUND,
      );
    }

    throw error;
  }

  private createProductNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_PRODUCT_NOT_FOUND',
      'The remembered product is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private toShoppingProduct(product: ShoppingProductEntity): ShoppingProduct {
    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      usageCount: product.usageCount,
      lastUsedAt: product.lastUsedAt === null ? null : toIsoDateTimeString(product.lastUsedAt),
      createdAt: toIsoDateTimeString(product.createdAt),
      updatedAt: toIsoDateTimeString(product.updatedAt),
    };
  }
}

function isShoppingProductCategoryForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23503' &&
    'constraint' in driverError &&
    driverError.constraint === 'shopping_products_category_id_fkey'
  );
}
