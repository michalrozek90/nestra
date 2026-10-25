import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShoppingPresets1785844800000 implements MigrationInterface {
  readonly name = 'CreateShoppingPresets1785844800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shopping_presets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name varchar(30) NOT NULL,
        store_profile_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_presets_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_presets_store_profile_id_fkey
          FOREIGN KEY (store_profile_id)
          REFERENCES shopping_store_profiles (id) ON DELETE SET NULL,
        CONSTRAINT shopping_presets_shape_check
          CHECK (
            char_length(name) BETWEEN 1 AND 30
            AND name = btrim(name)
            AND name !~ '[[:space:]]{2,}'
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX shopping_presets_owner_updated_idx
        ON shopping_presets (user_id, updated_at DESC, id)
    `);

    await queryRunner.query(`
      CREATE FUNCTION shopping_presets_enforce_limit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF (
          SELECT COUNT(*)
          FROM shopping_presets
          WHERE user_id = NEW.user_id
        ) >= 20 THEN
          RAISE EXCEPTION 'shopping preset limit reached'
            USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER shopping_presets_enforce_limit
      BEFORE INSERT ON shopping_presets
      FOR EACH ROW
      EXECUTE FUNCTION shopping_presets_enforce_limit()
    `);

    await queryRunner.query(`
      CREATE TABLE shopping_preset_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        preset_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity integer NOT NULL,
        position integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_preset_entries_preset_id_fkey
          FOREIGN KEY (preset_id) REFERENCES shopping_presets (id) ON DELETE CASCADE,
        CONSTRAINT shopping_preset_entries_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES shopping_products (id) ON DELETE CASCADE,
        CONSTRAINT shopping_preset_entries_shape_check
          CHECK (quantity BETWEEN 1 AND 999 AND position >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_preset_entries_preset_product_unique
        ON shopping_preset_entries (preset_id, product_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_preset_entries_preset_position_unique
        ON shopping_preset_entries (preset_id, position)
    `);

    await queryRunner.query(`
      CREATE FUNCTION shopping_preset_entries_enforce_limit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF (
          SELECT COUNT(*)
          FROM shopping_preset_entries
          WHERE preset_id = NEW.preset_id
        ) >= 150 THEN
          RAISE EXCEPTION 'shopping preset entry limit reached'
            USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER shopping_preset_entries_enforce_limit
      BEFORE INSERT ON shopping_preset_entries
      FOR EACH ROW
      EXECUTE FUNCTION shopping_preset_entries_enforce_limit()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE shopping_preset_entries');
    await queryRunner.query('DROP FUNCTION shopping_preset_entries_enforce_limit()');
    await queryRunner.query('DROP TABLE shopping_presets');
    await queryRunner.query('DROP FUNCTION shopping_presets_enforce_limit()');
  }
}
