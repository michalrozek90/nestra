import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowEmptyNoteContent1784894400000 implements MigrationInterface {
  readonly name = 'AllowEmptyNoteContent1784894400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notes
        DROP CONSTRAINT notes_content_not_blank_check
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // A downgrade must preserve title-only notes created while this migration was active.
    await queryRunner.query(`
      ALTER TABLE notes
        ADD CONSTRAINT notes_content_not_blank_check
          CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000)
          NOT VALID
    `);
  }
}
