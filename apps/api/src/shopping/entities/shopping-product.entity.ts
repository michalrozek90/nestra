import {
  SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH,
  SHOPPING_PRODUCT_NAME_MAX_LENGTH,
} from '@nestra/contracts';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shopping_products')
@Check(
  'shopping_products_shape_check',
  `char_length(name) BETWEEN 1 AND ${SHOPPING_PRODUCT_NAME_MAX_LENGTH}
    AND char_length(name_key) BETWEEN 1 AND ${SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH}
    AND name = btrim(name)
    AND name !~ '[[:space:]]{2,}'
    AND name_key = btrim(name_key)
    AND usage_count >= 0
    AND (
      (last_used_at IS NULL AND usage_count = 0)
      OR (last_used_at IS NOT NULL AND usage_count > 0)
    )`,
)
export class ShoppingProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @ForeignKey('users', { name: 'shopping_products_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  @ForeignKey('shopping_categories', {
    name: 'shopping_products_category_id_fkey',
    onDelete: 'RESTRICT',
  })
  categoryId!: string;

  @Column({ type: 'varchar', length: SHOPPING_PRODUCT_NAME_MAX_LENGTH })
  name!: string;

  @Column({ name: 'name_key', type: 'varchar', length: SHOPPING_PRODUCT_NAME_KEY_MAX_LENGTH })
  nameKey!: string;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount!: number;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
