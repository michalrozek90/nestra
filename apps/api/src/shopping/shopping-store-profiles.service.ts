import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  shoppingStoreProfileNameSchema,
  type ReplaceShoppingStoreProfileOrder,
  type ShoppingStoreProfile,
  type ShoppingStoreProfileCollection,
  type ShoppingStoreProfileSelection,
} from '@nestra/contracts';
import { DataSource, In, type EntityManager, type Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { toIsoDateTimeString } from '../common/date-time';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingStorePreferenceEntity } from './entities/shopping-store-preference.entity';
import { ShoppingStoreProfileCategoryEntity } from './entities/shopping-store-profile-category.entity';
import { ShoppingStoreProfileEntity } from './entities/shopping-store-profile.entity';
import {
  lockStoreProfileOrder,
  rememberSelectedStoreProfile,
} from './shopping-store-profile-order';

@Injectable()
export class ShoppingStoreProfilesService {
  constructor(
    @InjectRepository(ShoppingStoreProfileEntity)
    private readonly shoppingStoreProfileRepository: Repository<ShoppingStoreProfileEntity>,
    @InjectRepository(ShoppingStoreProfileCategoryEntity)
    private readonly shoppingStoreProfileCategoryRepository: Repository<ShoppingStoreProfileCategoryEntity>,
    @InjectRepository(ShoppingStorePreferenceEntity)
    private readonly shoppingStorePreferenceRepository: Repository<ShoppingStorePreferenceEntity>,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async listProfiles(userId: string): Promise<ShoppingStoreProfileCollection> {
    await this.databaseConnectionService.verifyConnection();
    const profiles = await this.shoppingStoreProfileRepository.find({
      where: { userId },
      order: { name: 'ASC', id: 'ASC' },
    });
    const preference = await this.shoppingStorePreferenceRepository.findOne({ where: { userId } });

    return {
      lastSelectedProfileId: preference?.lastSelectedProfileId ?? null,
      profiles: await this.toShoppingStoreProfiles(
        this.shoppingStoreProfileCategoryRepository,
        profiles,
      ),
    };
  }

  async createProfile(userId: string, name: string): Promise<ShoppingStoreProfile> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parseProfileName(name);

    return this.dataSource.transaction(async (entityManager) => {
      await lockStoreProfileOrder(entityManager, userId);
      const profileRepository = entityManager.getRepository(ShoppingStoreProfileEntity);
      const categoryRepository = entityManager.getRepository(ShoppingCategoryEntity);
      const entryRepository = entityManager.getRepository(ShoppingStoreProfileCategoryEntity);
      const categories = await this.listCurrentCategories(categoryRepository, userId);
      const savedProfile = await profileRepository.save(
        profileRepository.create({
          userId,
          name: normalizedName,
        }),
      );

      if (categories.length > 0) {
        await entryRepository.save(
          categories.map((category, position) =>
            entryRepository.create({
              profileId: savedProfile.id,
              categoryId: category.id,
              position,
            }),
          ),
        );
      }

      const [profile] = await this.toShoppingStoreProfiles(entryRepository, [savedProfile]);

      if (profile === undefined) {
        throw new Error('The created store profile could not be read back.');
      }

      return profile;
    });
  }

  async getProfile(userId: string, profileId: string): Promise<ShoppingStoreProfile> {
    await this.databaseConnectionService.verifyConnection();
    const profile = await this.shoppingStoreProfileRepository.findOne({
      where: { id: profileId, userId },
    });

    if (profile === null) {
      throw this.createProfileNotFoundException();
    }

    const [storeProfile] = await this.toShoppingStoreProfiles(
      this.shoppingStoreProfileCategoryRepository,
      [profile],
    );

    if (storeProfile === undefined) {
      throw this.createProfileNotFoundException();
    }

    return storeProfile;
  }

  async renameProfile(
    userId: string,
    profileId: string,
    name: string,
  ): Promise<ShoppingStoreProfile> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedName = this.parseProfileName(name);

    return this.dataSource.transaction(async (entityManager) => {
      const profileRepository = entityManager.getRepository(ShoppingStoreProfileEntity);
      const profile = await this.lockOwnedProfile(profileRepository, userId, profileId);
      profile.name = normalizedName;
      const savedProfile = await profileRepository.save(profile);
      const [storeProfile] = await this.toShoppingStoreProfiles(
        entityManager.getRepository(ShoppingStoreProfileCategoryEntity),
        [savedProfile],
      );

      if (storeProfile === undefined) {
        throw this.createProfileNotFoundException();
      }

      return storeProfile;
    });
  }

  async replaceOrder(
    userId: string,
    profileId: string,
    order: ReplaceShoppingStoreProfileOrder,
  ): Promise<ShoppingStoreProfile> {
    await this.databaseConnectionService.verifyConnection();

    return this.dataSource.transaction(async (entityManager) => {
      await lockStoreProfileOrder(entityManager, userId);
      const profileRepository = entityManager.getRepository(ShoppingStoreProfileEntity);
      const categoryRepository = entityManager.getRepository(ShoppingCategoryEntity);
      const entryRepository = entityManager.getRepository(ShoppingStoreProfileCategoryEntity);
      const profile = await this.lockOwnedProfile(profileRepository, userId, profileId);
      const categories = await this.listCurrentCategories(categoryRepository, userId);
      this.assertCompleteCategoryOrder(categories, order.categoryIds);
      await entryRepository.delete({ profileId: profile.id });
      await entryRepository.save(
        order.categoryIds.map((categoryId, position) =>
          entryRepository.create({
            profileId: profile.id,
            categoryId,
            position,
          }),
        ),
      );
      profile.updatedAt = new Date();
      const savedProfile = await profileRepository.save(profile);
      const [storeProfile] = await this.toShoppingStoreProfiles(entryRepository, [savedProfile]);

      if (storeProfile === undefined) {
        throw this.createProfileNotFoundException();
      }

      return storeProfile;
    });
  }

  async selectProfile(userId: string, profileId: string): Promise<ShoppingStoreProfileSelection> {
    await this.databaseConnectionService.verifyConnection();

    return this.dataSource.transaction(async (entityManager) => {
      await this.lockOwnedProfile(
        entityManager.getRepository(ShoppingStoreProfileEntity),
        userId,
        profileId,
      );
      await rememberSelectedStoreProfile(entityManager, userId, profileId);

      return { lastSelectedProfileId: profileId };
    });
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();

    await this.dataSource.transaction(async (entityManager) => {
      const profile = await this.lockOwnedProfile(
        entityManager.getRepository(ShoppingStoreProfileEntity),
        userId,
        profileId,
      );

      await entityManager.query(
        `
          UPDATE shopping_lists
          SET store_profile_id = NULL,
              updated_at = now()
          WHERE user_id = $1 AND store_profile_id = $2
        `,
        [userId, profile.id],
      );
      await entityManager.query(
        `
          UPDATE shopping_store_preferences
          SET last_selected_profile_id = NULL
          WHERE user_id = $1 AND last_selected_profile_id = $2
        `,
        [userId, profile.id],
      );
      // Preset profile references join this transaction when that table exists.
      const deleteResult = await entityManager.getRepository(ShoppingStoreProfileEntity).delete({
        id: profile.id,
        userId,
      });

      if (deleteResult.affected !== 1) {
        throw this.createProfileNotFoundException();
      }
    });
  }

  async rememberOwnedProfileSelection(
    entityManager: EntityManager,
    userId: string,
    profileId: string,
  ): Promise<void> {
    await this.lockOwnedProfile(
      entityManager.getRepository(ShoppingStoreProfileEntity),
      userId,
      profileId,
    );
    await rememberSelectedStoreProfile(entityManager, userId, profileId);
  }

  private async listCurrentCategories(
    repository: Repository<ShoppingCategoryEntity>,
    userId: string,
  ): Promise<readonly ShoppingCategoryEntity[]> {
    return repository
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
  }

  private assertCompleteCategoryOrder(
    categories: readonly ShoppingCategoryEntity[],
    categoryIds: readonly string[],
  ): void {
    const expectedCategoryIds = categories.map((category) => category.id);
    const uniqueCategoryIds = new Set(categoryIds);
    const sameCategories =
      uniqueCategoryIds.size === categoryIds.length &&
      uniqueCategoryIds.size === expectedCategoryIds.length &&
      expectedCategoryIds.every((categoryId) => uniqueCategoryIds.has(categoryId));

    if (!sameCategories) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'A store profile order must contain each current category once.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async lockOwnedProfile(
    repository: Repository<ShoppingStoreProfileEntity>,
    userId: string,
    profileId: string,
  ): Promise<ShoppingStoreProfileEntity> {
    const profile = await repository.findOne({
      where: { id: profileId, userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (profile === null) {
      throw this.createProfileNotFoundException();
    }

    return profile;
  }

  private async toShoppingStoreProfiles(
    entryRepository: Repository<ShoppingStoreProfileCategoryEntity>,
    profiles: readonly ShoppingStoreProfileEntity[],
  ): Promise<ShoppingStoreProfile[]> {
    if (profiles.length === 0) {
      return [];
    }

    const entries = await entryRepository.find({
      where: { profileId: In(profiles.map((profile) => profile.id)) },
      order: { position: 'ASC', id: 'ASC' },
    });
    const categoryIdsByProfileId = new Map<string, string[]>();

    for (const entry of entries) {
      const categoryIds = categoryIdsByProfileId.get(entry.profileId) ?? [];
      categoryIds.push(entry.categoryId);
      categoryIdsByProfileId.set(entry.profileId, categoryIds);
    }

    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      categoryIds: categoryIdsByProfileId.get(profile.id) ?? [],
      createdAt: toIsoDateTimeString(profile.createdAt),
      updatedAt: toIsoDateTimeString(profile.updatedAt),
    }));
  }

  private parseProfileName(name: string): string {
    const parsedName = shoppingStoreProfileNameSchema.safeParse(name);

    if (!parsedName.success) {
      throw new ApiException(
        'VALIDATION_FAILED',
        'The store profile name is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedName.data;
  }

  private createProfileNotFoundException(): ApiException {
    return new ApiException(
      'SHOPPING_STORE_PROFILE_NOT_FOUND',
      'The store profile is missing or is not owned by the authenticated user.',
      HttpStatus.NOT_FOUND,
    );
  }
}
