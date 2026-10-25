import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  getShoppingBuiltInCategoryLabels,
  shoppingBuiltInCategoryKeySchema,
  shoppingCategoryNameSchema,
  toShoppingComparisonKey,
  type ShoppingCategory,
  type ShoppingCategoryList,
} from '@nestra/contracts';
import { DataSource, type Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { isShoppingCategoryNameConflict } from './shopping-category-name-conflict';

@Injectable()
export class ShoppingCategoriesService {
  constructor(
    @InjectRepository(ShoppingCategoryEntity)
    private readonly shoppingCategoryRepository: Repository<ShoppingCategoryEntity>,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listCategories(userId: string): Promise<ShoppingCategoryList> {
    await this.databaseConnectionService.verifyConnection();
    const categories = await this.shoppingCategoryRepository
      .createQueryBuilder('category')
      .where('category.kind = :builtInKind OR category.userId = :userId', {
        builtInKind: 'built_in',
        userId,
      })
      .orderBy('category.builtInPosition', 'ASC', 'NULLS LAST')
      .addOrderBy('category.nameKey', 'ASC')
      .addOrderBy('category.createdAt', 'ASC')
      .addOrderBy('category.id', 'ASC')
      .getMany();

    return categories.map((category) => this.toShoppingCategory(category));
  }

  async createCategory(userId: string, name: string): Promise<ShoppingCategory> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parseCategoryName(name);

    try {
      const savedCategory = await this.shoppingCategoryRepository.save(
        this.shoppingCategoryRepository.create({
          userId,
          kind: 'custom',
          builtInKey: null,
          name: normalizedName,
          nameKey: toShoppingComparisonKey(normalizedName),
          builtInPosition: null,
        }),
      );

      return this.toShoppingCategory(savedCategory);
    } catch (error: unknown) {
      if (isShoppingCategoryNameConflict(error)) {
        throw this.createNameConflictException();
      }

      throw error;
    }
  }

  async renameCategory(
    userId: string,
    categoryId: string,
    name: string,
  ): Promise<ShoppingCategory> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parseCategoryName(name);

    return this.dataSource.transaction(async (entityManager) => {
      const transactionalRepository = entityManager.getRepository(ShoppingCategoryEntity);
      const ownedCategory = await this.lockOwnedCustomCategory(
        transactionalRepository,
        userId,
        categoryId,
      );

      ownedCategory.name = normalizedName;
      ownedCategory.nameKey = toShoppingComparisonKey(normalizedName);

      try {
        const savedCategory = await transactionalRepository.save(ownedCategory);
        return this.toShoppingCategory(savedCategory);
      } catch (error: unknown) {
        if (isShoppingCategoryNameConflict(error)) {
          throw this.createNameConflictException();
        }

        throw error;
      }
    });
  }

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();

    await this.dataSource.transaction(async (entityManager) => {
      const transactionalRepository = entityManager.getRepository(ShoppingCategoryEntity);
      const ownedCategory = await this.lockOwnedCustomCategory(
        transactionalRepository,
        userId,
        categoryId,
      );

      // Product reassignment and store-profile cleanup must join this transaction
      // once those tables exist. Removing the category row stays the last step.
      const deleteResult = await transactionalRepository.delete({
        id: ownedCategory.id,
        userId,
        kind: 'custom',
      });

      if (deleteResult.affected !== 1) {
        throw this.createNotFoundException();
      }
    });
  }

  private async lockOwnedCustomCategory(
    repository: Repository<ShoppingCategoryEntity>,
    userId: string,
    categoryId: string,
  ): Promise<ShoppingCategoryEntity> {
    const ownedCategory = await repository.findOne({
      where: { id: categoryId, userId, kind: 'custom' },
      lock: { mode: 'pessimistic_write' },
    });

    if (ownedCategory !== null) {
      return ownedCategory;
    }

    await this.rejectUnavailableCategory(repository, categoryId);
    throw this.createNotFoundException();
  }

  private parseCategoryName(name: string): string {
    const parsedName = shoppingCategoryNameSchema.safeParse(name);

    if (!parsedName.success) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The shopping category name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedName.data;
  }

  private async rejectUnavailableCategory(
    repository: Repository<ShoppingCategoryEntity>,
    categoryId: string,
  ): Promise<never> {
    const builtInCategory = await repository.findOne({
      where: { id: categoryId, kind: 'built_in' },
    });

    if (builtInCategory !== null) {
      throw new ApiException(
        'SHOPPING_CATEGORY_BUILT_IN',
        'Built-in shopping categories cannot be changed.',
        HttpStatus.CONFLICT,
      );
    }

    throw this.createNotFoundException();
  }

  private createNameConflictException(): ApiException {
    return new ApiException(
      'SHOPPING_CATEGORY_NAME_ALREADY_EXISTS',
      'A shopping category with this name already exists.',
      HttpStatus.CONFLICT,
    );
  }

  private createNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_CATEGORY_NOT_FOUND',
      'The shopping category is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private toShoppingCategory(category: ShoppingCategoryEntity): ShoppingCategory {
    const createdAt = toIsoDateTimeString(category.createdAt);
    const updatedAt = toIsoDateTimeString(category.updatedAt);

    if (category.kind === 'built_in') {
      const parsedKey = shoppingBuiltInCategoryKeySchema.safeParse(category.builtInKey);

      if (!parsedKey.success || category.name !== null || category.userId !== null) {
        throw this.createInvalidCategoryException();
      }

      return {
        id: category.id,
        kind: 'built_in',
        builtInKey: parsedKey.data,
        name: null,
        labels: getShoppingBuiltInCategoryLabels(parsedKey.data),
        createdAt,
        updatedAt,
      };
    }

    if (category.name === null || category.builtInKey !== null || category.userId === null) {
      throw this.createInvalidCategoryException();
    }

    return {
      id: category.id,
      kind: 'custom',
      builtInKey: null,
      name: category.name,
      labels: null,
      createdAt,
      updatedAt,
    };
  }

  private createInvalidCategoryException(): ApiException {
    return new ApiException(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
