import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingListItemEntity } from './entities/shopping-list-item.entity';
import { ShoppingListEntity } from './entities/shopping-list.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingCategoriesController } from './shopping-categories.controller';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { ShoppingProductsController } from './shopping-products.controller';
import { ShoppingProductsService } from './shopping-products.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      ShoppingCategoryEntity,
      ShoppingProductEntity,
      ShoppingListEntity,
      ShoppingListItemEntity,
    ]),
  ],
  controllers: [ShoppingCategoriesController, ShoppingProductsController, ShoppingListsController],
  providers: [ShoppingCategoriesService, ShoppingProductsService, ShoppingListsService],
})
export class ShoppingModule {}
