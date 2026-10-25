import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SHOPPING_PRESET_ENTRY_LIMIT,
  SHOPPING_PRESET_LIMIT,
  shoppingPresetNameSchema,
  type CreateShoppingPreset,
  type ReplaceShoppingPresetEntries,
  type ShoppingPreset,
  type ShoppingPresetEntry,
  type ShoppingPresetSummaryList,
  type UpdateShoppingPreset,
} from '@nestra/contracts';
import { DataSource, In, QueryFailedError, type EntityManager, type Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingPresetEntryEntity } from './entities/shopping-preset-entry.entity';
import { ShoppingPresetEntity } from './entities/shopping-preset.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

type ShoppingPresetEntryInput = ReplaceShoppingPresetEntries['entries'][number];

@Injectable()
export class ShoppingPresetsService {
  constructor(
    @InjectRepository(ShoppingPresetEntity)
    private readonly shoppingPresetRepository: Repository<ShoppingPresetEntity>,
    @InjectRepository(ShoppingPresetEntryEntity)
    private readonly shoppingPresetEntryRepository: Repository<ShoppingPresetEntryEntity>,
    @InjectRepository(ShoppingProductEntity)
    private readonly shoppingProductRepository: Repository<ShoppingProductEntity>,
    private readonly shoppingStoreProfilesService: ShoppingStoreProfilesService,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listPresets(userId: string): Promise<ShoppingPresetSummaryList> {
    await this.databaseConnectionService.verifyConnection();
    const presets = await this.shoppingPresetRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC', id: 'ASC' },
    });

    if (presets.length === 0) {
      return [];
    }

    const counts = await this.dataSource.query<Array<{ preset_id: string; entry_count: number }>>(
      `
        SELECT preset_id, COUNT(*)::int AS entry_count
        FROM shopping_preset_entries
        WHERE preset_id = ANY($1::uuid[])
        GROUP BY preset_id
      `,
      [presets.map((preset) => preset.id)],
    );
    const entryCountByPresetId = new Map(
      counts.map((count) => [count.preset_id, count.entry_count]),
    );

    return presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      storeProfileId: preset.storeProfileId,
      entryCount: Number(entryCountByPresetId.get(preset.id) ?? 0),
      createdAt: toIsoDateTimeString(preset.createdAt),
      updatedAt: toIsoDateTimeString(preset.updatedAt),
    }));
  }

  async createPreset(userId: string, presetInput: CreateShoppingPreset): Promise<ShoppingPreset> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parsePresetName(presetInput.name);
    const entries = presetInput.entries ?? [];
    this.assertEntryShape(entries);

    return this.dataSource.transaction(async (entityManager) => {
      await lockShoppingPresetCatalog(entityManager, userId);
      const presetRepository = entityManager.getRepository(ShoppingPresetEntity);
      const presetCount = await presetRepository.count({ where: { userId } });

      if (presetCount >= SHOPPING_PRESET_LIMIT) {
        throw this.createPresetLimitException();
      }

      if (typeof presetInput.storeProfileId === 'string') {
        await this.shoppingStoreProfilesService.assertOwnedStoreProfile(
          entityManager,
          userId,
          presetInput.storeProfileId,
        );
      }

      try {
        const savedPreset = await presetRepository.save(
          presetRepository.create({
            userId,
            name: normalizedName,
            storeProfileId: presetInput.storeProfileId ?? null,
          }),
        );
        await this.insertEntries(entityManager, userId, savedPreset.id, entries);

        return await this.readOwnedPreset(
          presetRepository,
          entityManager.getRepository(ShoppingPresetEntryEntity),
          entityManager.getRepository(ShoppingProductEntity),
          userId,
          savedPreset.id,
        );
      } catch (error: unknown) {
        if (isShoppingPresetLimit(error)) {
          throw this.createPresetLimitException();
        }

        if (isShoppingPresetEntryLimit(error)) {
          throw this.createEntryLimitException();
        }

        throw error;
      }
    });
  }

  async getPreset(userId: string, presetId: string): Promise<ShoppingPreset> {
    await this.databaseConnectionService.verifyConnection();

    return this.readOwnedPreset(
      this.shoppingPresetRepository,
      this.shoppingPresetEntryRepository,
      this.shoppingProductRepository,
      userId,
      presetId,
    );
  }

  async updatePreset(
    userId: string,
    presetId: string,
    presetInput: UpdateShoppingPreset,
  ): Promise<ShoppingPreset> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName =
      presetInput.name === undefined ? undefined : this.parsePresetName(presetInput.name);

    return this.dataSource.transaction(async (entityManager) => {
      if (typeof presetInput.storeProfileId === 'string') {
        await this.shoppingStoreProfilesService.assertOwnedStoreProfile(
          entityManager,
          userId,
          presetInput.storeProfileId,
        );
      }

      const presetRepository = entityManager.getRepository(ShoppingPresetEntity);
      const preset = await this.lockOwnedPreset(presetRepository, userId, presetId);

      if (normalizedName !== undefined) {
        preset.name = normalizedName;
      }

      if (presetInput.storeProfileId === null) {
        preset.storeProfileId = null;
      } else if (presetInput.storeProfileId !== undefined) {
        preset.storeProfileId = presetInput.storeProfileId;
      }

      await presetRepository.save(preset);

      return this.readOwnedPreset(
        presetRepository,
        entityManager.getRepository(ShoppingPresetEntryEntity),
        entityManager.getRepository(ShoppingProductEntity),
        userId,
        preset.id,
      );
    });
  }

  async replaceEntries(
    userId: string,
    presetId: string,
    replacement: ReplaceShoppingPresetEntries,
  ): Promise<ShoppingPreset> {
    await this.databaseConnectionService.verifyConnection();
    this.assertEntryShape(replacement.entries);

    return this.dataSource.transaction(async (entityManager) => {
      const presetRepository = entityManager.getRepository(ShoppingPresetEntity);
      const entryRepository = entityManager.getRepository(ShoppingPresetEntryEntity);
      const preset = await this.lockOwnedPreset(presetRepository, userId, presetId);
      await entryRepository.delete({ presetId: preset.id });
      await this.insertEntries(entityManager, userId, preset.id, replacement.entries);
      preset.updatedAt = new Date();
      await presetRepository.save(preset);

      return this.readOwnedPreset(
        presetRepository,
        entryRepository,
        entityManager.getRepository(ShoppingProductEntity),
        userId,
        preset.id,
      );
    });
  }

  async deletePreset(userId: string, presetId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();

    await this.dataSource.transaction(async (entityManager) => {
      await lockShoppingPresetCatalog(entityManager, userId);
      const deleteResult = await entityManager.getRepository(ShoppingPresetEntity).delete({
        id: presetId,
        userId,
      });

      if (deleteResult.affected !== 1) {
        throw this.createPresetNotFoundException();
      }
    });
  }

  private async insertEntries(
    entityManager: EntityManager,
    userId: string,
    presetId: string,
    entries: readonly ShoppingPresetEntryInput[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const products = await entityManager.getRepository(ShoppingProductEntity).find({
      where: { userId, id: In(entries.map((entry) => entry.productId)) },
    });

    if (products.length !== entries.length) {
      throw this.createProductNotFoundException();
    }

    const entryRepository = entityManager.getRepository(ShoppingPresetEntryEntity);

    try {
      await entryRepository.save(
        entries.map((entry, position) =>
          entryRepository.create({
            presetId,
            productId: entry.productId,
            quantity: entry.quantity,
            position,
          }),
        ),
      );
    } catch (error: unknown) {
      if (isShoppingPresetEntryLimit(error)) {
        throw this.createEntryLimitException();
      }

      throw error;
    }
  }

  private assertEntryShape(entries: readonly ShoppingPresetEntryInput[]): void {
    if (entries.length > SHOPPING_PRESET_ENTRY_LIMIT) {
      throw this.createEntryLimitException();
    }

    const productIds = new Set(entries.map((entry) => entry.productId));

    if (productIds.size !== entries.length) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'A shopping preset can contain each remembered product once.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async lockOwnedPreset(
    repository: Repository<ShoppingPresetEntity>,
    userId: string,
    presetId: string,
  ): Promise<ShoppingPresetEntity> {
    const preset = await repository.findOne({
      where: { id: presetId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (preset === null) {
      throw this.createPresetNotFoundException();
    }

    return preset;
  }

  private async readOwnedPreset(
    presetRepository: Repository<ShoppingPresetEntity>,
    entryRepository: Repository<ShoppingPresetEntryEntity>,
    productRepository: Repository<ShoppingProductEntity>,
    userId: string,
    presetId: string,
  ): Promise<ShoppingPreset> {
    const preset = await presetRepository.findOne({ where: { id: presetId, userId } });

    if (preset === null) {
      throw this.createPresetNotFoundException();
    }

    const entries = await entryRepository.find({
      where: { presetId: preset.id },
      order: { position: 'ASC', id: 'ASC' },
    });
    const products =
      entries.length === 0
        ? []
        : await productRepository.find({
            where: { userId, id: In(entries.map((entry) => entry.productId)) },
          });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return {
      id: preset.id,
      name: preset.name,
      storeProfileId: preset.storeProfileId,
      entries: entries.map((entry) => this.toShoppingPresetEntry(entry, productsById)),
      createdAt: toIsoDateTimeString(preset.createdAt),
      updatedAt: toIsoDateTimeString(preset.updatedAt),
    };
  }

  private toShoppingPresetEntry(
    entry: ShoppingPresetEntryEntity,
    productsById: ReadonlyMap<string, ShoppingProductEntity>,
  ): ShoppingPresetEntry {
    const product = productsById.get(entry.productId);

    if (product === undefined) {
      throw new Error('A shopping-preset row is missing its remembered product.');
    }

    return {
      id: entry.id,
      productId: product.id,
      name: product.name,
      categoryId: product.categoryId,
      quantity: entry.quantity,
      position: entry.position,
    };
  }

  private parsePresetName(name: string): string {
    const parsedName = shoppingPresetNameSchema.safeParse(name);

    if (!parsedName.success) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The shopping preset name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedName.data;
  }

  private createPresetNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_PRESET_NOT_FOUND',
      'The shopping preset is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private createProductNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_PRODUCT_NOT_FOUND',
      'The remembered product is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }

  private createPresetLimitException(): ApiException {
    return new ApiException(
      'SHOPPING_PRESET_LIMIT_REACHED',
      'A user cannot keep more than 20 shopping presets.',
      HttpStatus.CONFLICT,
    );
  }

  private createEntryLimitException(): ApiException {
    return new ApiException(
      'SHOPPING_PRESET_ENTRY_LIMIT_REACHED',
      'A shopping preset cannot contain more than 150 products.',
      HttpStatus.CONFLICT,
    );
  }
}

async function lockShoppingPresetCatalog(
  entityManager: EntityManager,
  userId: string,
): Promise<void> {
  // Serializes preset creation and deletion so the 20-preset count cannot be passed by two writes.
  await entityManager.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
    'nestra.shopping-preset',
    userId,
  ]);
}

function isShoppingPresetLimit(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    error.message.includes('shopping preset limit reached')
  );
}

function isShoppingPresetEntryLimit(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.message === 'string' &&
    error.message.includes('shopping preset entry limit reached')
  );
}
