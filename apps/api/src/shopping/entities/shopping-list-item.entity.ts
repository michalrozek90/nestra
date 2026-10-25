import { SHOPPING_LIST_QUANTITY_MAX, SHOPPING_LIST_QUANTITY_MIN } from '@nestra/contracts';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shopping_list_items')
@Check(
  'shopping_list_items_shape_check',
  `quantity BETWEEN ${SHOPPING_LIST_QUANTITY_MIN} AND ${SHOPPING_LIST_QUANTITY_MAX}
    AND position >= 0`,
)
export class ShoppingListItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'list_id', type: 'uuid' })
  @ForeignKey('shopping_lists', { name: 'shopping_list_items_list_id_fkey', onDelete: 'CASCADE' })
  listId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @ForeignKey('shopping_products', {
    name: 'shopping_list_items_product_id_fkey',
    onDelete: 'CASCADE',
  })
  productId!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
