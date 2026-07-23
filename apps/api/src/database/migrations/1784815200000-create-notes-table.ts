import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotesTable1784815200000 implements MigrationInterface {
  readonly name = 'CreateNotesTable1784815200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        title varchar(120) NOT NULL,
        content varchar(20000) NOT NULL,
        is_pinned boolean NOT NULL DEFAULT false,
        is_archived boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notes_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT notes_title_not_blank_check
          CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
        CONSTRAINT notes_content_not_blank_check
          CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000),
        CONSTRAINT notes_archived_not_pinned_check
          CHECK (NOT (is_archived AND is_pinned))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX notes_owner_list_idx
        ON notes (user_id, is_archived, is_pinned DESC, updated_at DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE notes');
  }
}
