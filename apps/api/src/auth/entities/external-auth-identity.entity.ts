import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from './user.entity';

export const EXTERNAL_AUTH_PROVIDER_GOOGLE = 'google' as const;

export type ExternalAuthProvider = typeof EXTERNAL_AUTH_PROVIDER_GOOGLE;

@Entity('external_auth_identities')
@Unique('external_auth_identities_provider_provider_subject_unique', [
  'provider',
  'providerSubject',
])
@Unique('external_auth_identities_user_id_provider_unique', ['userId', 'provider'])
@Index('external_auth_identities_user_id_idx', ['userId'])
export class ExternalAuthIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.externalAuthIdentities, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'external_auth_identities_user_id_fkey',
  })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  provider!: ExternalAuthProvider;

  @Column({ name: 'provider_subject', type: 'varchar', length: 255 })
  providerSubject!: string;

  @Column({ name: 'provider_email', type: 'varchar', length: 254 })
  providerEmail!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
