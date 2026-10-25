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

@Entity('shopping_preset_entries')
@Check(
  'shopping_preset_entries_shape_check',
  `quantity BETWEEN ${SHOPPING_LIST_QUANTITY_MIN} AND ${SHOPPING_LIST_QUANTITY_MAX}
    AND position >= 0`,
)
export class ShoppingPresetEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'preset_id', type: 'uuid' })
  @ForeignKey('shopping_presets', {
    name: 'shopping_preset_entries_preset_id_fkey',
    onDelete: 'CASCADE',
  })
  presetId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  @ForeignKey('shopping_products', {
    name: 'shopping_preset_entries_product_id_fkey',
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
