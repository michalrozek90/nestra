import { SHOPPING_PRESET_NAME_MAX_LENGTH } from '@nestra/contracts';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shopping_presets')
@Check(
  'shopping_presets_shape_check',
  `char_length(name) BETWEEN 1 AND ${SHOPPING_PRESET_NAME_MAX_LENGTH}
    AND name = btrim(name)
    AND name !~ '[[:space:]]{2,}'`,
)
export class ShoppingPresetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @ForeignKey('users', { name: 'shopping_presets_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string;

  @Column({ type: 'varchar', length: SHOPPING_PRESET_NAME_MAX_LENGTH })
  name!: string;

  @Column({ name: 'store_profile_id', type: 'uuid', nullable: true })
  @ForeignKey('shopping_store_profiles', {
    name: 'shopping_presets_store_profile_id_fkey',
    onDelete: 'SET NULL',
  })
  storeProfileId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
