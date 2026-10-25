import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SHOPPING_LIST_ITEM_LIMIT,
  SHOPPING_LIST_QUANTITY_MAX,
  shoppingListNameSchema,
  type AddShoppingListItem,
  type ShoppingList,
  type ShoppingListSummaryList,
  type UpdateShoppingList,
  type UpdateShoppingListItem,
} from '@nestra/contracts';
import { DataSource, In, QueryFailedError, type Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingProductsService } from './shopping-products.service';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

@Injectable()
export class ShoppingListsService {
  constructor(
    @InjectRepository(ShoppingListEntity)
    private readonly shoppingListRepository: Repository<ShoppingListEntity>,
    @InjectRepository(ShoppingListItemEntity)
    private readonly shoppingListItemRepository: Repository<ShoppingListItemEntity>,
    @InjectRepository(ShoppingProductEntity)
    private readonly shoppingProductRepository: Repository<ShoppingProductEntity>,
    private readonly shoppingProductsService: ShoppingProductsService,
    private readonly shoppingStoreProfilesService: ShoppingStoreProfilesService,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listLists(userId: string): Promise<ShoppingListSummaryList> {
    await this.databaseConnectionService.verifyConnection();
    const lists = await this.shoppingListRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC', id: 'ASC' },
    });

    if (lists.length === 0) {
      return [];
    }

    const counts = await this.dataSource.query<Array<{ list_id: string; item_count: number }>>(
      `
        SELECT list_id, COUNT(*)::int AS item_count
        FROM shopping_list_items
        WHERE list_id = ANY($1::uuid[])
        GROUP BY list_id
      `,
      [lists.map((list) => list.id)],
    );
    const itemCountByListId = new Map(counts.map((count) => [count.list_id, count.item_count]));

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      storeProfileId: list.storeProfileId,
      itemCount: Number(itemCountByListId.get(list.id) ?? 0),
      createdAt: toIsoDateTimeString(list.createdAt),
      updatedAt: toIsoDateTimeString(list.updatedAt),
    }));
  }

  async createList(userId: string, name: string): Promise<ShoppingList> {
    await this.databaseConnectionService.verifyConnection();
    const savedList = await this.shoppingListRepository.save(
      this.shoppingListRepository.create({
        userId,
        name: this.parseListName(name),
        storeProfileId: null,
      }),
    );

    return this.toShoppingList(savedList, []);
  }

  async getList(userId: string, listId: string): Promise<ShoppingList> {
    await this.databaseConnectionService.verifyConnection();

    return this.readOwnedList(
      this.shoppingListRepository,
      this.shoppingListItemRepository,
      this.shoppingProductRepository,
      userId,
      listId,
    );
  }

  async renameList(userId: string, listId: string, name: string): Promise<ShoppingList> {
    return this.updateList(userId, listId, { name });
  }

  async updateList(
    userId: string,
    listId: string,
    listInput: UpdateShoppingList,
  ): Promise<ShoppingList> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName =
      listInput.name === undefined ? undefined : this.parseListName(listInput.name);

    return this.dataSource.transaction(async (entityManager) => {
      if (typeof listInput.storeProfileId === 'string') {
        await this.shoppingStoreProfilesService.rememberOwnedProfileSelection(
          entityManager,
          userId,
          listInput.storeProfileId,
        );
      }

      const listRepository = entityManager.getRepository(ShoppingListEntity);
      const list = await this.lockOwnedList(listRepository, userId, listId);

      if (normalizedName !== undefined) {
        list.name = normalizedName;
      }

      if (listInput.storeProfileId === null) {
        list.storeProfileId = null;
      } else if (listInput.storeProfileId !== undefined) {
        list.storeProfileId = listInput.storeProfileId;
      }

      await listRepository.save(list);

      return this.readOwnedList(
        listRepository,
        entityManager.getRepository(ShoppingListItemEntity),
        entityManager.getRepository(ShoppingProductEntity),
        userId,
        list.id,
      );
    });
  }

  async deleteList(userId: string, listId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();
    const deleteResult = await this.shoppingListRepository.delete({ id: listId, userId });

    if (deleteResult.affected !== 1) {
      throw this.createListNotFoundException();
    }
  }

  async addItem(
    userId: string,
    listId: string,
    itemInput: AddShoppingListItem,
  ): Promise<ShoppingList> {
    await this.databaseConnectionService.verifyConnection();
    const quantity = itemInput.quantity ?? 1;

    return this.dataSource.transaction(async (entityManager) => {
      const listRepository = entityManager.getRepository(ShoppingListEntity);
      const itemRepository = entityManager.getRepository(ShoppingListItemEntity);
      const list = await this.lockOwnedList(listRepository, userId, listId);
      const product = await this.shoppingProductsService.findOrRememberProduct(
        entityManager,
        userId,
        {
          ...(itemInput.productId === undefined ? {} : { productId: itemInput.productId }),
          ...(itemInput.name === undefined ? {} : { name: itemInput.name }),
          ...(itemInput.categoryId === undefined ? {} : { categoryId: itemInput.categoryId }),
        },
      );
      const existingItem = await itemRepository.findOne({
        where: { listId: list.id, productId: product.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (existingItem === null) {
        await this.insertUniqueItem(itemRepository, list.id, product.id, quantity);
      } else {
        this.applyQuantityMerge(existingItem, quantity);
        await itemRepository.save(existingItem);
      }

      await this.shoppingProductsService.recordShoppingListUsageWithManager(
        entityManager,
        userId,
        product.id,
        new Date(),
      );
      await this.touchOwnedList(listRepository, userId, list.id);

      return this.readOwnedList(
        listRepository,
        itemRepository,
        entityManager.getRepository(ShoppingProductEntity),
        userId,
        list.id,
      );
    });
  }

  async updateItem(
    userId: string,
    listId: string,
    itemId: string,
    itemInput: UpdateShoppingListItem,
  ): Promise<ShoppingList> {
    await this.databaseConnectionService.verifyConnection();

    return this.dataSource.transaction(async (entityManager) => {
      const listRepository = entityManager.getRepository(ShoppingListEntity);
      const itemRepository = entityManager.getRepository(ShoppingListItemEntity);
      const list = await this.lockOwnedList(listRepository, userId, listId);
      const item = await this.lockListItem(itemRepository, list.id, itemId);
      const nextQuantity = itemInput.quantity ?? item.quantity;

      if (itemInput.name === undefined) {
        item.quantity = nextQuantity;
        await itemRepository.save(item);
      } else {
        const product = await this.shoppingProductsService.findOrRememberProduct(
          entityManager,
          userId,
          {
            name: itemInput.name,
            ...(itemInput.categoryId === undefined ? {} : { categoryId: itemInput.categoryId }),
          },
        );

        if (product.id === item.productId) {
          item.quantity = nextQuantity;
          await itemRepository.save(item);
        } else {
          const destinationItem = await itemRepository.findOne({
            where: { listId: list.id, productId: product.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (destinationItem === null) {
            item.productId = product.id;
            item.quantity = nextQuantity;
            await itemRepository.save(item);
          } else {
            this.applyQuantityMerge(destinationItem, nextQuantity);
            await itemRepository.save(destinationItem);
            await itemRepository.delete({ id: item.id, listId: list.id });
          }
        }
      }

      await this.touchOwnedList(listRepository, userId, list.id);

      return this.readOwnedList(
        listRepository,
        itemRepository,
        entityManager.getRepository(ShoppingProductEntity),
        userId,
        list.id,
      );
    });
  }

  async removeItem(userId: string, listId: string, itemId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();

    await this.dataSource.transaction(async (entityManager) => {
      const listRepository = entityManager.getRepository(ShoppingListEntity);
      const list = await this.lockOwnedList(listRepository, userId, listId);
      const deleteResult = await entityManager.getRepository(ShoppingListItemEntity).delete({
        id: itemId,
        listId: list.id,
      });

      if (deleteResult.affected !== 1) {
        throw this.createItemNotFoundException();
      }

      await this.touchOwnedList(listRepository, userId, list.id);
    });
  }

  private async insertUniqueItem(
    itemRepository: Repository<ShoppingListItemEntity>,
    listId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    const itemCount = await itemRepository.count({ where: { listId } });

    if (itemCount >= SHOPPING_LIST_ITEM_LIMIT) {
      throw this.createItemLimitException();
    }

    const positionRows = await itemRepository.query<
      Array<{ max_position: number | string | null }>
    >(
      `
        SELECT COALESCE(MAX(position), -1) AS max_position
        FROM shopping_list_items
        WHERE list_id = $1
      `,
      [listId],
    );
    const maxPosition = Number(positionRows[0]?.max_position ?? -1);
    const nextPosition = Number.isInteger(maxPosition) ? maxPosition + 1 : 0;

    try {
      await itemRepository.save(
        itemRepository.create({
          listId,
          productId,
          quantity,
          position: nextPosition,
        }),
      );
    } catch (error: unknown) {
      if (isShoppingListItemLimit(error)) {
        throw this.createItemLimitException();
      }

      throw error;
    }
  }

  private applyQuantityMerge(existingItem: ShoppingListItemEntity, quantity: number): void {
    const nextQuantity = existingItem.quantity + quantity;

    if (nextQuantity > SHOPPING_LIST_QUANTITY_MAX) {
      throw new ApiException(
        'SHOPPING_LIST_QUANTITY_EXCEEDED',
        'The shopping-list quantity cannot exceed 999.',
        HttpStatus.CONFLICT,
      );
    }

    existingItem.quantity = nextQuantity;
  }

  private async lockListItem(
    repository: Repository<ShoppingListItemEntity>,
    listId: string,
    itemId: string,
  ): Promise<ShoppingListItemEntity> {
    const item = await repository.findOne({
      where: { id: itemId, listId },
      lock: { mode: 'pessimistic_write' },
    });

    if (item === null) {
      throw this.createItemNotFoundException();
    }

    return item;
  }

  private async touchOwnedList(
    listRepository: Repository<ShoppingListEntity>,
    userId: string,
    listId: string,
  ): Promise<void> {
    await listRepository
      .createQueryBuilder()
      .update(ShoppingListEntity)
      .set({ updatedAt: () => 'now()' })
      .where('id = :listId', { listId })
      .andWhere('user_id = :userId', { userId })
      .execute();
  }

  private async lockOwnedList(
    repository: Repository<ShoppingListEntity>,
    userId: string,
    listId: string,
  ): Promise<ShoppingListEntity> {
    const list = await repository.findOne({
      where: { id: listId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (list === null) {
      throw this.createListNotFoundException();
    }

    return list;
  }

  private async readOwnedList(
    listRepository: Repository<ShoppingListEntity>,
    itemRepository: Repository<ShoppingListItemEntity>,
    productRepository: Repository<ShoppingProductEntity>,
    userId: string,
    listId: string,
  ): Promise<ShoppingList> {
    const list = await listRepository.findOne({ where: { id: listId, userId } });

    if (list === null) {
      throw this.createListNotFoundException();
    }

    const items = await itemRepository.find({
      where: { listId: list.id },
      order: { position: 'ASC', id: 'ASC' },
    });
    const products =
      items.length === 0
        ? []
        : await productRepository.find({
            where: { userId, id: In(items.map((item) => item.productId)) },
          });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return this.toShoppingList(
      list,
      items.map((item) => {
        const product = productsById.get(item.productId);

        if (product === undefined) {
          throw new Error('A shopping-list row is missing its remembered product.');
        }

        return {
          id: item.id,
          productId: product.id,
          name: product.name,
          categoryId: product.categoryId,
          quantity: item.quantity,
          position: item.position,
        };
      }),
    );
  }

  private parseListName(name: string): string {
    const parsedName = shoppingListNameSchema.safeParse(name);

    if (!parsedName.success) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The shopping list name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedName.data;
  }

  private createListNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_LIST_NOT_FOUND',
      'The shopping list is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private createItemNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_LIST_ITEM_NOT_FOUND',
      'The shopping-list item is missing or is not on a list owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private createItemLimitException(): ApiException {
    return new ApiException(
      'SHOPPING_LIST_ITEM_LIMIT_REACHED',
      'A shopping list cannot contain more than 250 products.',
      HttpStatus.CONFLICT,
    );
  }

  private toShoppingList(list: ShoppingListEntity, items: ShoppingList['items']): ShoppingList {
    return {
      id: list.id,
      name: list.name,
      storeProfileId: list.storeProfileId,
      items,
      createdAt: toIsoDateTimeString(list.createdAt),
      updatedAt: toIsoDateTimeString(list.updatedAt),
    };
  }
}

function isShoppingListItemLimit(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    error.message.includes('shopping list item limit reached')
  );
}
