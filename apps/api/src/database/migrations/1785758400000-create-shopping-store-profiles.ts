import type { MigrationInterface, QueryRunner } from 'typeorm';

const SHOPPING_OTHER_CATEGORY_ID = '0e8a4d21-6c59-4b73-a047-5f1d9c3e8b62';

export class CreateShoppingStoreProfiles1785758400000 implements MigrationInterface {
  readonly name = 'CreateShoppingStoreProfiles1785758400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shopping_store_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name varchar(40) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_store_profiles_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_store_profiles_shape_check
          CHECK (
            char_length(name) BETWEEN 1 AND 40
            AND name = btrim(name)
            AND name !~ '[[:space:]]{2,}'
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX shopping_store_profiles_owner_name_idx
        ON shopping_store_profiles (user_id, name, id)
    `);

    await queryRunner.query(`
      CREATE TABLE shopping_store_profile_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id uuid NOT NULL,
        category_id uuid NOT NULL,
        position integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_store_profile_categories_profile_id_fkey
          FOREIGN KEY (profile_id) REFERENCES shopping_store_profiles (id) ON DELETE CASCADE,
        CONSTRAINT shopping_store_profile_categories_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES shopping_categories (id) ON DELETE CASCADE,
        CONSTRAINT shopping_store_profile_categories_shape_check
          CHECK (position >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_store_profile_categories_profile_category_unique
        ON shopping_store_profile_categories (profile_id, category_id)
    `);

    await queryRunner.query(`
      ALTER TABLE shopping_store_profile_categories
      ADD CONSTRAINT shopping_store_profile_categories_profile_position_unique
      UNIQUE (profile_id, position)
      DEFERRABLE INITIALLY DEFERRED
    `);

    await queryRunner.query(`
      CREATE TABLE shopping_store_preferences (
        user_id uuid PRIMARY KEY,
        last_selected_profile_id uuid NULL,
        CONSTRAINT shopping_store_preferences_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_store_preferences_profile_id_fkey
          FOREIGN KEY (last_selected_profile_id)
          REFERENCES shopping_store_profiles (id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE shopping_lists
      ADD COLUMN store_profile_id uuid NULL,
      ADD CONSTRAINT shopping_lists_store_profile_id_fkey
        FOREIGN KEY (store_profile_id)
        REFERENCES shopping_store_profiles (id) ON DELETE SET NULL
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

          WITH removed AS (
            DELETE FROM shopping_store_profile_categories
            WHERE category_id = OLD.id
            RETURNING profile_id
          ),
          ranked AS (
            SELECT entry.id,
                   (row_number() OVER (
                     PARTITION BY entry.profile_id
                     ORDER BY entry.position, entry.id
                   ) - 1)::integer AS next_position
            FROM shopping_store_profile_categories AS entry
            WHERE entry.profile_id IN (SELECT profile_id FROM removed)
          )
          UPDATE shopping_store_profile_categories AS entry
          SET position = ranked.next_position,
              updated_at = now()
          FROM ranked
          WHERE entry.id = ranked.id
            AND entry.position <> ranked.next_position;

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

    await queryRunner.query(`
      ALTER TABLE shopping_lists
      DROP CONSTRAINT shopping_lists_store_profile_id_fkey,
      DROP COLUMN store_profile_id
    `);
    await queryRunner.query('DROP TABLE shopping_store_preferences');
    await queryRunner.query('DROP TABLE shopping_store_profile_categories');
    await queryRunner.query('DROP TABLE shopping_store_profiles');
  }
}
