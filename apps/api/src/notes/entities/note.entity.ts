import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ForeignKey,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notes')
@Index('notes_owner_list_idx', ['userId', 'isTrashed', 'isPinned', 'updatedAt'])
@Check('notes_trashed_not_pinned_check', 'NOT (is_trashed AND is_pinned)')
@Check('notes_document_not_blank_check', 'char_length(btrim(document)) BETWEEN 1 AND 20122')
export class NoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @ForeignKey('users', { name: 'notes_user_id_fkey', onDelete: 'CASCADE' })
  userId!: string;

  @Column({ type: 'varchar', length: 20_122 })
  document!: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned!: boolean;

  @Column({ name: 'is_trashed', type: 'boolean', default: false })
  isTrashed!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
