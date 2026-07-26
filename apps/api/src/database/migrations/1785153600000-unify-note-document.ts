import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyNoteDocument1785153600000 implements MigrationInterface {
  readonly name = 'UnifyNoteDocument1785153600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notes
        ADD COLUMN document varchar(20122)
    `);
    await queryRunner.query(`
      UPDATE notes
      SET document =
        CASE
          WHEN content = '' THEN title
          ELSE title || E'\n\n' || content
        END
    `);
    await queryRunner.query(`
      ALTER TABLE notes
        ALTER COLUMN document SET NOT NULL,
        DROP CONSTRAINT notes_title_not_blank_check,
        DROP COLUMN content,
        DROP COLUMN title,
        ADD CONSTRAINT notes_document_not_blank_check
          CHECK (char_length(btrim(document)) BETWEEN 1 AND 20122)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notes
        ADD COLUMN content text,
        ADD COLUMN title text
    `);
    await queryRunner.query(`
      UPDATE notes
      SET title = regexp_replace(
        split_part(document, E'\n', 1),
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      )
    `);
    await queryRunner.query(`
      UPDATE notes
      SET content =
        CASE
          WHEN document = title THEN ''
          WHEN left(document, char_length(title) + 2) = title || E'\n\n'
            THEN substring(document FROM char_length(title) + 3)
          WHEN position(E'\n' IN document) > 0
            THEN substring(document FROM position(E'\n' IN document) + 1)
          ELSE ''
        END
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM notes
          WHERE char_length(title) > 120 OR char_length(content) > 20000
        ) THEN
          RAISE EXCEPTION
            'Unified note data exceeds the legacy title or content limit; downgrade aborted.';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE notes
        DROP CONSTRAINT notes_document_not_blank_check,
        DROP COLUMN document,
        ALTER COLUMN title TYPE varchar(120),
        ALTER COLUMN content TYPE varchar(20000),
        ALTER COLUMN title SET NOT NULL,
        ALTER COLUMN content SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE notes
        ADD CONSTRAINT notes_title_not_blank_check
          CHECK (char_length(btrim(title)) BETWEEN 1 AND 120)
    `);
  }
}
