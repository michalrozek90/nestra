import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceNotesArchiveWithTrash1785067200000 implements MigrationInterface {
  readonly name = 'ReplaceNotesArchiveWithTrash1785067200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX notes_owner_list_idx');
    await queryRunner.query(`
      ALTER TABLE notes
        DROP CONSTRAINT notes_archived_not_pinned_check
    `);
    await queryRunner.query('ALTER TABLE notes RENAME COLUMN is_archived TO is_trashed');
    await queryRunner.query(`
      ALTER TABLE notes
        ADD CONSTRAINT notes_trashed_not_pinned_check
          CHECK (NOT (is_trashed AND is_pinned))
    `);
    await queryRunner.query(`
      CREATE INDEX notes_owner_list_idx
        ON notes (user_id, is_trashed, is_pinned DESC, updated_at DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX notes_owner_list_idx');
    await queryRunner.query(`
      ALTER TABLE notes
        DROP CONSTRAINT notes_trashed_not_pinned_check
    `);
    await queryRunner.query('ALTER TABLE notes RENAME COLUMN is_trashed TO is_archived');
    await queryRunner.query(`
      ALTER TABLE notes
        ADD CONSTRAINT notes_archived_not_pinned_check
          CHECK (NOT (is_archived AND is_pinned))
    `);
    await queryRunner.query(`
      CREATE INDEX notes_owner_list_idx
        ON notes (user_id, is_archived, is_pinned DESC, updated_at DESC)
    `);
  }
}
