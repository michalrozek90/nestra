import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type {
  ExternalAuthTransactionIntent,
  ExternalAuthTransactionStatus,
} from '../external-auth-transaction.constants';
import { UserEntity } from './user.entity';

@Entity('external_auth_transactions')
@Index('external_auth_transactions_state_hash_unique', ['stateHash'], { unique: true })
@Index('external_auth_transactions_handoff_code_hash_unique', ['handoffCodeHash'], { unique: true })
@Index('external_auth_transactions_provider_expires_at_idx', ['providerExpiresAt'])
@Index('external_auth_transactions_handoff_expires_at_idx', ['handoffExpiresAt'])
@Index('external_auth_transactions_status_idx', ['status'])
export class ExternalAuthTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: 'google';

  @Column({ type: 'varchar', length: 16 })
  intent!: ExternalAuthTransactionIntent;

  @Column({ type: 'varchar', length: 16 })
  platform!: 'web' | 'android' | 'ios' | 'desktop';

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'external_auth_transactions_user_id_fkey',
  })
  user!: UserEntity | null;

  @Column({ name: 'return_uri', type: 'varchar' })
  returnUri!: string;

  @Column({ name: 'state_hash', type: 'char', length: 64 })
  stateHash!: string;

  @Column({ name: 'request_secrets_ciphertext', type: 'text', nullable: true })
  requestSecretsCiphertext!: string | null;

  @Column({ name: 'handoff_challenge', type: 'char', length: 43 })
  handoffChallenge!: string;

  @Column({ name: 'handoff_code_hash', type: 'char', length: 64, nullable: true })
  handoffCodeHash!: string | null;

  @Column({ name: 'validated_claims_ciphertext', type: 'text', nullable: true })
  validatedClaimsCiphertext!: string | null;

  @Column({ type: 'varchar', length: 32 })
  status!: ExternalAuthTransactionStatus;

  @Column({ name: 'processing_lease_expires_at', type: 'timestamptz', nullable: true })
  processingLeaseExpiresAt!: Date | null;

  @Column({ name: 'outcome_error_code', type: 'varchar', length: 64, nullable: true })
  outcomeErrorCode!: string | null;

  @Column({ name: 'provider_expires_at', type: 'timestamptz' })
  providerExpiresAt!: Date;

  @Column({ name: 'handoff_expires_at', type: 'timestamptz', nullable: true })
  handoffExpiresAt!: Date | null;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
