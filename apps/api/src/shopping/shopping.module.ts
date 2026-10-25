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
import { ShoppingStoreProfileEntity } from './entities/shopping-store-profile.entity';
import { ShoppingCategoriesController } from './shopping-categories.controller';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingProductsController } from './shopping-products.controller';
import { ShoppingProductsService } from './shopping-products.service';
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
    ]),
  ],
  controllers: [
    ShoppingCategoriesController,
    ShoppingProductsController,
    ShoppingListsController,
    ShoppingStoreProfilesController,
  ],
  providers: [
    ShoppingCategoriesService,
    ShoppingProductsService,
    ShoppingStoreProfilesService,
    ShoppingListsService,
  ],
})
export class ShoppingModule {}
