import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ExternalAuthIdentityEntity } from './external-auth-identity.entity';
import { RefreshSessionEntity } from './refresh-session.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @OneToMany(() => RefreshSessionEntity, (refreshSession) => refreshSession.user)
  refreshSessions!: readonly RefreshSessionEntity[];

  @OneToMany(() => ExternalAuthIdentityEntity, (externalAuthIdentity) => externalAuthIdentity.user)
  externalAuthIdentities!: readonly ExternalAuthIdentityEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
