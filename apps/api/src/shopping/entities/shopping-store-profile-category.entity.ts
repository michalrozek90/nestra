import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shopping_store_profile_categories')
@Check('shopping_store_profile_categories_shape_check', 'position >= 0')
export class ShoppingStoreProfileCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  @ForeignKey('shopping_store_profiles', {
    name: 'shopping_store_profile_categories_profile_id_fkey',
    onDelete: 'CASCADE',
  })
  profileId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  @ForeignKey('shopping_categories', {
    name: 'shopping_store_profile_categories_category_id_fkey',
    onDelete: 'CASCADE',
  })
  categoryId!: string;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
