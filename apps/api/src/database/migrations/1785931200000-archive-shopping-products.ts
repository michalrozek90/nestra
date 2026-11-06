import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ArchiveShoppingProducts1785931200000 implements MigrationInterface {
  readonly name = 'ArchiveShoppingProducts1785931200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shopping_products
        ADD COLUMN archived_at timestamptz NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shopping_products
        DROP COLUMN archived_at
    `);
  }
}
