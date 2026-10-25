import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShoppingCategories1785499200000 implements MigrationInterface {
  readonly name = 'CreateShoppingCategories1785499200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shopping_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NULL,
        kind varchar(16) NOT NULL,
        built_in_key varchar(64) NULL,
        name varchar(40) NULL,
        name_key varchar(80) NULL,
        built_in_position smallint NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_categories_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_categories_kind_check
          CHECK (kind IN ('built_in', 'custom')),
        CONSTRAINT shopping_categories_shape_check
          CHECK (
            (
              kind = 'built_in'
              AND user_id IS NULL
              AND built_in_key IS NOT NULL
              AND name IS NULL
              AND name_key IS NULL
              AND built_in_position IS NOT NULL
              AND built_in_position >= 0
            )
            OR
            (
              kind = 'custom'
              AND user_id IS NOT NULL
              AND built_in_key IS NULL
              AND name IS NOT NULL
              AND name_key IS NOT NULL
              AND char_length(name) BETWEEN 1 AND 40
              AND char_length(name_key) BETWEEN 1 AND 80
              AND name = btrim(name)
              AND name !~ '[[:space:]]{2,}'
              AND name_key = btrim(name_key)
              AND built_in_position IS NULL
            )
          ),
        CONSTRAINT shopping_categories_built_in_key_unique
          UNIQUE (built_in_key),
        CONSTRAINT shopping_categories_built_in_position_unique
          UNIQUE (built_in_position)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_categories_owner_name_key_unique
        ON shopping_categories (user_id, name_key)
        WHERE kind = 'custom'
    `);

    await queryRunner.query(`
      CREATE INDEX shopping_categories_owner_idx
        ON shopping_categories (user_id)
        WHERE user_id IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO shopping_categories (
        id,
        user_id,
        kind,
        built_in_key,
        name,
        name_key,
        built_in_position
      )
      VALUES
        (
          '8d2f4c1a-6b3e-4a57-9c10-2e7b5a9d4f31',
          NULL,
          'built_in',
          'fruit_and_vegetables',
          NULL,
          NULL,
          0
        ),
        (
          '3c6e1b90-5a24-4f7d-8b61-9d0e2c4a7b18',
          NULL,
          'built_in',
          'bakery',
          NULL,
          NULL,
          1
        ),
        (
          '7a1e9c42-0d58-4b63-a2f4-6c8d1e5b9037',
          NULL,
          'built_in',
          'dairy',
          NULL,
          NULL,
          2
        ),
        (
          '2b8d4f67-1c90-4e35-9a72-5f3c8d6e1a04',
          NULL,
          'built_in',
          'meat',
          NULL,
          NULL,
          3
        ),
        (
          '9e4a2c85-7f16-4d28-b390-1a6c5e8d2b47',
          NULL,
          'built_in',
          'frozen',
          NULL,
          NULL,
          4
        ),
        (
          '4f7c3a19-8e62-4b05-9d14-7c2a6f0e5b83',
          NULL,
          'built_in',
          'beverages',
          NULL,
          NULL,
          5
        ),
        (
          '6a0d8e53-2b47-4c91-8f36-9e1b4d7a0c25',
          NULL,
          'built_in',
          'household',
          NULL,
          NULL,
          6
        ),
        (
          '1c5b9e70-4a83-4f26-b158-3d7e2a6c9f04',
          NULL,
          'built_in',
          'cosmetics',
          NULL,
          NULL,
          7
        ),
        (
          '0e8a4d21-6c59-4b73-a047-5f1d9c3e8b62',
          NULL,
          'built_in',
          'other',
          NULL,
          NULL,
          8
        )
    `);

    await queryRunner.query(`
      CREATE FUNCTION shopping_categories_prevent_built_in_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND OLD.kind = 'built_in' THEN
          RAISE EXCEPTION 'built-in shopping categories cannot be deleted'
            USING ERRCODE = '23514';
        END IF;

        IF TG_OP = 'UPDATE' AND OLD.kind = 'built_in' THEN
          RAISE EXCEPTION 'built-in shopping categories cannot be changed'
            USING ERRCODE = '23514';
        END IF;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;

        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER shopping_categories_protect_built_in
      BEFORE UPDATE OR DELETE ON shopping_categories
      FOR EACH ROW
      EXECUTE FUNCTION shopping_categories_prevent_built_in_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE shopping_categories');
    await queryRunner.query('DROP FUNCTION shopping_categories_prevent_built_in_mutation()');
  }
}
