import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthenticationTables1784469600000 implements MigrationInterface {
  readonly name = 'CreateAuthenticationTables1784469600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(254) NOT NULL,
        password_hash varchar(255) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_unique UNIQUE (email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_hash char(64) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT refresh_sessions_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX refresh_sessions_user_id_idx ON refresh_sessions (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX refresh_sessions_expires_at_idx ON refresh_sessions (expires_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE refresh_sessions');
    await queryRunner.query('DROP TABLE users');
  }
}
