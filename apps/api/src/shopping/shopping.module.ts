import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingProductEntity } from './entities/shopping-product.entity';
import { ShoppingCategoriesController } from './shopping-categories.controller';
import { ShoppingCategoriesService } from './shopping-categories.service';
import { ShoppingProductsController } from './shopping-products.controller';
import { ShoppingProductsService } from './shopping-products.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    TypeOrmModule.forFeature([ShoppingCategoryEntity, ShoppingProductEntity]),
  ],
  controllers: [ShoppingCategoriesController, ShoppingProductsController],
  providers: [ShoppingCategoriesService, ShoppingProductsService],
})
export class ShoppingModule {}
