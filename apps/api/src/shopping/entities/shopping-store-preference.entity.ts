import { Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';

@Entity('shopping_store_preferences')
export class ShoppingStorePreferenceEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  @ForeignKey('users', { name: 'shopping_store_preferences_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string;

  @Column({ name: 'last_selected_profile_id', type: 'uuid', nullable: true })
  @ForeignKey('shopping_store_profiles', {
    name: 'shopping_store_preferences_profile_id_fkey',
    onDelete: 'SET NULL',
  })
  lastSelectedProfileId!: string | null;
}
