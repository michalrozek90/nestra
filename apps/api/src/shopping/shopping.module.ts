import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth';
import { DatabaseModule } from '../database/database.module';
import { ShoppingCategoryEntity } from './entities/shopping-category.entity';
import { ShoppingCategoriesController } from './shopping-categories.controller';
import { ShoppingCategoriesService } from './shopping-categories.service';

@Module({
  imports: [AuthModule, DatabaseModule, TypeOrmModule.forFeature([ShoppingCategoryEntity])],
  controllers: [ShoppingCategoriesController],
  providers: [ShoppingCategoriesService],
})
export class ShoppingModule {}
