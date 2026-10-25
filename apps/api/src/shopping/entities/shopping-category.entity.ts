import {
  SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH,
  SHOPPING_CATEGORY_NAME_MAX_LENGTH,
  type ShoppingBuiltInCategoryKey,
  type ShoppingCategoryKind,
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

@Entity('shopping_categories')
@Check('shopping_categories_kind_check', "kind IN ('built_in', 'custom')")
@Check(
  'shopping_categories_shape_check',
  `(
    kind = 'built_in'
    AND user_id IS NULL
    AND built_in_key IS NOT NULL
    AND name IS NULL
    AND name_key IS NULL
    AND built_in_position IS NOT NULL
    AND built_in_position >= 0
  ) OR (
    kind = 'custom'
    AND user_id IS NOT NULL
    AND built_in_key IS NULL
    AND name IS NOT NULL
    AND name_key IS NOT NULL
    AND char_length(name) BETWEEN 1 AND ${SHOPPING_CATEGORY_NAME_MAX_LENGTH}
    AND char_length(name_key) BETWEEN 1 AND ${SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH}
    AND name = btrim(name)
    AND name !~ '[[:space:]]{2,}'
    AND name_key = btrim(name_key)
    AND built_in_position IS NULL
  )`,
)
export class ShoppingCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @ForeignKey('users', { name: 'shopping_categories_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  kind!: ShoppingCategoryKind;

  @Column({ name: 'built_in_key', type: 'varchar', length: 64, nullable: true })
  builtInKey!: ShoppingBuiltInCategoryKey | null;

  @Column({ type: 'varchar', length: SHOPPING_CATEGORY_NAME_MAX_LENGTH, nullable: true })
  name!: string | null;

  @Column({
    name: 'name_key',
    type: 'varchar',
    length: SHOPPING_CATEGORY_NAME_KEY_MAX_LENGTH,
    nullable: true,
  })
  nameKey!: string | null;

  @Column({ name: 'built_in_position', type: 'smallint', nullable: true })
  builtInPosition!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
