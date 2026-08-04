import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalAuthIdentities1785326400000 implements MigrationInterface {
  readonly name = 'AddExternalAuthIdentities1785326400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ALTER COLUMN password_hash DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE external_auth_identities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        provider varchar(32) NOT NULL,
        provider_subject varchar(255) NOT NULL,
        provider_email varchar(254) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT external_auth_identities_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT external_auth_identities_provider_provider_subject_unique
          UNIQUE (provider, provider_subject),
        CONSTRAINT external_auth_identities_user_id_provider_unique
          UNIQUE (user_id, provider)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX external_auth_identities_user_id_idx
        ON external_auth_identities (user_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE external_auth_identities');

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM users
          WHERE password_hash IS NULL
        ) THEN
          RAISE EXCEPTION
            'Cannot restore users.password_hash NOT NULL while external-only users exist';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE users
        ALTER COLUMN password_hash SET NOT NULL
    `);
  }
}
