import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShoppingLists1785672000000 implements MigrationInterface {
  readonly name = 'CreateShoppingLists1785672000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shopping_lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        name varchar(40) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_lists_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT shopping_lists_shape_check
          CHECK (
            char_length(name) BETWEEN 1 AND 40
            AND name = btrim(name)
            AND name !~ '[[:space:]]{2,}'
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX shopping_lists_owner_updated_idx
        ON shopping_lists (user_id, updated_at DESC, id)
    `);

    await queryRunner.query(`
      CREATE TABLE shopping_list_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id uuid NOT NULL,
        product_id uuid NOT NULL,
        quantity integer NOT NULL,
        position integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT shopping_list_items_list_id_fkey
          FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE,
        CONSTRAINT shopping_list_items_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES shopping_products (id) ON DELETE CASCADE,
        CONSTRAINT shopping_list_items_shape_check
          CHECK (quantity BETWEEN 1 AND 999 AND position >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_list_items_list_product_unique
        ON shopping_list_items (list_id, product_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX shopping_list_items_list_position_unique
        ON shopping_list_items (list_id, position)
    `);

    await queryRunner.query(`
      CREATE FUNCTION shopping_list_items_enforce_limit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF (
          SELECT COUNT(*)
          FROM shopping_list_items
          WHERE list_id = NEW.list_id
        ) >= 250 THEN
          RAISE EXCEPTION 'shopping list item limit reached'
            USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE TRIGGER shopping_list_items_enforce_limit
      BEFORE INSERT ON shopping_list_items
      FOR EACH ROW
      EXECUTE FUNCTION shopping_list_items_enforce_limit()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE shopping_list_items');
    await queryRunner.query('DROP FUNCTION shopping_list_items_enforce_limit()');
    await queryRunner.query('DROP TABLE shopping_lists');
  }
}
