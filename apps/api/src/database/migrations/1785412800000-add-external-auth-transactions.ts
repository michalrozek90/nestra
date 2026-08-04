import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExternalAuthTransactions1785412800000 implements MigrationInterface {
  readonly name = 'AddExternalAuthTransactions1785412800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE external_auth_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(32) NOT NULL,
        intent varchar(16) NOT NULL,
        platform varchar(16) NOT NULL,
        user_id uuid NULL REFERENCES users (id) ON DELETE CASCADE,
        return_uri varchar NOT NULL,
        state_hash char(64) NOT NULL UNIQUE,
        request_secrets_ciphertext text NULL,
        handoff_challenge char(43) NOT NULL,
        handoff_code_hash char(64) NULL UNIQUE,
        validated_claims_ciphertext text NULL,
        status varchar(32) NOT NULL,
        processing_lease_expires_at timestamptz NULL,
        outcome_error_code varchar(64) NULL,
        provider_expires_at timestamptz NOT NULL,
        handoff_expires_at timestamptz NULL,
        consumed_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX external_auth_transactions_provider_expires_at_idx ON external_auth_transactions (provider_expires_at)',
    );
    await queryRunner.query(
      'CREATE INDEX external_auth_transactions_handoff_expires_at_idx ON external_auth_transactions (handoff_expires_at)',
    );
    await queryRunner.query(
      'CREATE INDEX external_auth_transactions_status_idx ON external_auth_transactions (status)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE external_auth_transactions');
  }
}
