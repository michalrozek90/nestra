import { SHOPPING_LIST_NAME_MAX_LENGTH } from '@nestra/contracts';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shopping_lists')
@Check(
  'shopping_lists_shape_check',
  `char_length(name) BETWEEN 1 AND ${SHOPPING_LIST_NAME_MAX_LENGTH}
    AND name = btrim(name)
    AND name !~ '[[:space:]]{2,}'`,
)
export class ShoppingListEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @ForeignKey('users', { name: 'shopping_lists_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string;

  @Column({ type: 'varchar', length: SHOPPING_LIST_NAME_MAX_LENGTH })
  name!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
