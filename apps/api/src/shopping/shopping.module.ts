import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingStorePreferenceEntity } from './entities/shopping-store-preference.entity';
import { ShoppingStoreProfileCategoryEntity } from './entities/shopping-store-profile-category.entity';
import { ShoppingPresetEntryEntity } from './entities/shopping-preset-entry.entity';
import { ShoppingPresetEntity } from './entities/shopping-preset.entity';
import { ShoppingStoreProfileEntity } from './entities/shopping-store-profile.entity';
import { ShoppingCategoriesController } from './shopping-categories.controller';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingProductsController } from './shopping-products.controller';
import { ShoppingProductsService } from './shopping-products.service';
import { ShoppingPresetsController } from './shopping-presets.controller';
import { ShoppingPresetsService } from './shopping-presets.service';
import { ShoppingStoreProfilesController } from './shopping-store-profiles.controller';
import { ShoppingStoreProfilesService } from './shopping-store-profiles.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      ShoppingCategoryEntity,
      ShoppingProductEntity,
      ShoppingListEntity,
      ShoppingListItemEntity,
      ShoppingStoreProfileEntity,
      ShoppingStoreProfileCategoryEntity,
      ShoppingStorePreferenceEntity,
      ShoppingPresetEntity,
      ShoppingPresetEntryEntity,
    ]),
  ],
  controllers: [
    ShoppingCategoriesController,
    ShoppingProductsController,
    ShoppingListsController,
    ShoppingStoreProfilesController,
    ShoppingPresetsController,
  ],
  providers: [
    ShoppingCategoriesService,
    ShoppingProductsService,
    ShoppingStoreProfilesService,
    ShoppingListsService,
    ShoppingPresetsService,
  ],
})
export class ShoppingModule {}
