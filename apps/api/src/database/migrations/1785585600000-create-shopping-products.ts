import type { MigrationInterface, QueryRunner } from 'typeorm';

const SHOPPING_OTHER_CATEGORY_ID = '0e8a4d21-6c59-4b73-a047-5f1d9c3e8b62';

export class CreateShoppingProducts1785585600000 implements MigrationInterface {
  readonly name = 'CreateShoppingProducts1785585600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shopping_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        category_id uuid NOT NULL,
        name varchar(30) NOT NULL,
        name_key varchar(60) NOT NULL,
        usage_count integer NOT NULL DEFAULT 0,
        last_used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_products_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_products_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES shopping_categories (id) ON DELETE RESTRICT,
        CONSTRAINT shopping_products_shape_check
          CHECK (
            char_length(name) BETWEEN 1 AND 30
            AND char_length(name_key) BETWEEN 1 AND 60
            AND name = btrim(name)
            AND name !~ '[[:space:]]{2,}'
            AND name_key = btrim(name_key)
            AND usage_count >= 0
            AND (
              (last_used_at IS NULL AND usage_count = 0)
              OR (last_used_at IS NOT NULL AND usage_count > 0)
            )
          )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_products_owner_name_key_unique
        ON shopping_products (user_id, name_key)
    `);

    await queryRunner.query(`
      CREATE INDEX shopping_products_owner_category_idx
        ON shopping_products (user_id, category_id)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION shopping_categories_prevent_built_in_mutation()
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

        IF TG_OP = 'DELETE' AND OLD.kind = 'custom' THEN
          UPDATE shopping_products
          SET category_id = '${SHOPPING_OTHER_CATEGORY_ID}',
              updated_at = now()
          WHERE category_id = OLD.id;
          RETURN OLD;
        END IF;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;

        RETURN NEW;
      END;
      $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION shopping_categories_prevent_built_in_mutation()
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

    await queryRunner.query('DROP TABLE shopping_products');
  }
}
