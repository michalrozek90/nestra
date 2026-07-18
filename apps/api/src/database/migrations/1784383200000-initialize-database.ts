import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeDatabase1784383200000 implements MigrationInterface {
  readonly name = 'InitializeDatabase1784383200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT 1');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT 1');
  }
}
