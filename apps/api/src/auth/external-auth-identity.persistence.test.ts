import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

import { Client } from 'pg';
import { DataSource, QueryFailedError } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { createDatabaseOptions } from '../database/database-options';
import {
  EXTERNAL_AUTH_PROVIDER_GOOGLE,
  ExternalAuthIdentityEntity,
} from './entities/external-auth-identity.entity';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import { UserEntity } from './entities/user.entity';
import { ExternalAuthIdentityService } from './external-auth-identity.service';
import { PasswordService } from './password.service';

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://nestra:nestra_dev_password@localhost:5432/nestra';
const CONSTRAINT_TEST_DATABASE_NAME = 'nestra_external_auth_identity_test';
const MIGRATION_TEST_DATABASE_NAME = 'nestra_external_auth_identity_migration_test';

function resolveAdminDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_ADMIN_URL ?? process.env.DATABASE_URL ?? DEFAULT_ADMIN_DATABASE_URL
  );
}

function buildDatabaseUrl(adminDatabaseUrl: string, databaseName: string): string {
  const parsedDatabaseUrl = new URL(adminDatabaseUrl);
  parsedDatabaseUrl.pathname = `/${databaseName}`;
  return parsedDatabaseUrl.toString();
}

async function recreateDatabase(adminDatabaseUrl: string, databaseName: string): Promise<void> {
  const client = new Client({ connectionString: adminDatabaseUrl });
  await client.connect();

  try {
    const existingDatabase = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists`,
      [databaseName],
    );

    if (existingDatabase.rows[0]?.exists === true) {
      await client.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `,
        [databaseName],
      );
      await client.query(`DROP DATABASE ${databaseName}`);
    }

    await client.query(`CREATE DATABASE ${databaseName}`);
  } finally {
    await client.end();
  }
}

async function createTestDataSource(databaseName: string): Promise<DataSource> {
  const adminDatabaseUrl = resolveAdminDatabaseUrl();
  await recreateDatabase(adminDatabaseUrl, databaseName);

  const dataSource = new DataSource(
    createDatabaseOptions(buildDatabaseUrl(adminDatabaseUrl, databaseName)),
  );
  await dataSource.initialize();
  return dataSource;
}

async function isPostgresAvailable(adminDatabaseUrl: string): Promise<boolean> {
  const client = new Client({ connectionString: adminDatabaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

describe('external auth identity migration retention', () => {
  let dataSource: DataSource | undefined;
  let passwordService: PasswordService | undefined;

  before(async () => {
    if (!(await isPostgresAvailable(resolveAdminDatabaseUrl()))) {
      return;
    }

    dataSource = await createTestDataSource(MIGRATION_TEST_DATABASE_NAME);
    passwordService = new PasswordService();
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('keeps existing password users intact after the migration', async (testContext) => {
    if (dataSource === undefined || passwordService === undefined) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return;
    }

    const identityMigration = dataSource.migrations.find(
      (migration) => migration.name === 'AddExternalAuthIdentities1785326400000',
    );
    assert.ok(identityMigration !== undefined);

    await dataSource.runMigrations();
    await dataSource.undoLastMigration();
    await dataSource.undoLastMigration();

    const passwordHash = await passwordService.hashPassword('password-1');
    const userId = randomUUID();
    const noteId = randomUUID();
    const sessionId = randomUUID();
    const email = `password-user-${randomUUID()}@example.com`;

    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash)
        VALUES ($1, $2, $3)
      `,
      [userId, email, passwordHash],
    );
    await dataSource.query(
      `
        INSERT INTO notes (id, user_id, document)
        VALUES ($1, $2, $3)
      `,
      [noteId, userId, 'Migrated note'],
    );
    await dataSource.query(
      `
        INSERT INTO refresh_sessions (
          id, user_id, token_hash, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, now() + interval '1 day', now(), now())
      `,
      [sessionId, userId, 'a'.repeat(64)],
    );

    const passwordNullabilityBefore = await dataSource.query<{ is_nullable: string }[]>(
      `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      `,
    );
    assert.equal(passwordNullabilityBefore[0]?.is_nullable, 'NO');

    await dataSource.runMigrations();

    const passwordNullabilityAfter = await dataSource.query<{ is_nullable: string }[]>(
      `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      `,
    );
    const persistedUser = await dataSource.query<{ id: string; password_hash: string }[]>(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId],
    );
    const notes = await dataSource.query<{ id: string }[]>(
      'SELECT id FROM notes WHERE user_id = $1',
      [userId],
    );
    const sessions = await dataSource.query<{ id: string }[]>(
      'SELECT id FROM refresh_sessions WHERE user_id = $1',
      [userId],
    );
    const identityTable = await dataSource.query<{ exists: boolean }[]>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'external_auth_identities'
        ) AS exists
      `,
    );

    assert.equal(passwordNullabilityAfter[0]?.is_nullable, 'YES');
    assert.equal(identityTable[0]?.exists, true);
    assert.deepEqual(persistedUser, [{ id: userId, password_hash: passwordHash }]);
    assert.deepEqual(
      notes.map((note) => note.id),
      [noteId],
    );
    assert.deepEqual(
      sessions.map((session) => session.id),
      [sessionId],
    );
  });
});

describe('external auth identity persistence', () => {
  let dataSource: DataSource | undefined;
  let externalAuthIdentityService: ExternalAuthIdentityService | undefined;
  let passwordService: PasswordService | undefined;

  before(async () => {
    if (!(await isPostgresAvailable(resolveAdminDatabaseUrl()))) {
      return;
    }

    dataSource = await createTestDataSource(CONSTRAINT_TEST_DATABASE_NAME);
    await dataSource.runMigrations();

    externalAuthIdentityService = new ExternalAuthIdentityService(
      dataSource.getRepository(ExternalAuthIdentityEntity),
    );
    passwordService = new PasswordService();
  });

  after(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  function requirePersistence(testContext: { skip: (message?: string) => void }): {
    dataSource: DataSource;
    externalAuthIdentityService: ExternalAuthIdentityService;
    passwordService: PasswordService;
  } | null {
    if (
      dataSource === undefined ||
      externalAuthIdentityService === undefined ||
      passwordService === undefined
    ) {
      testContext.skip('Postgres is unavailable for persistence tests');
      return null;
    }

    return { dataSource, externalAuthIdentityService, passwordService };
  }

  async function createExternalOnlyUser(
    persistence: {
      dataSource: DataSource;
    },
    email: string,
  ): Promise<UserEntity> {
    const userRepository = persistence.dataSource.getRepository(UserEntity);
    return userRepository.save(
      userRepository.create({
        email,
        passwordHash: null,
      }),
    );
  }

  it('allows google-created accounts without password hashes', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const user = await createExternalOnlyUser(
      persistence,
      `external-only-${randomUUID()}@example.com`,
    );
    const identity = await persistence.externalAuthIdentityService.createIdentity({
      userId: user.id,
      provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
      providerSubject: `subject-${randomUUID()}`,
      providerEmail: user.email,
    });

    const persistedUser = await persistence.dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({ id: user.id });
    const isPasswordValid = await persistence.passwordService.verifyPassword(
      'any-password',
      persistedUser.passwordHash,
    );

    assert.equal(persistedUser.passwordHash, null);
    assert.equal(isPasswordValid, false);
    assert.equal(identity.provider, EXTERNAL_AUTH_PROVIDER_GOOGLE);
  });

  it('enforces a globally unique provider subject', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const firstUser = await createExternalOnlyUser(
      persistence,
      `subject-a-${randomUUID()}@example.com`,
    );
    const secondUser = await createExternalOnlyUser(
      persistence,
      `subject-b-${randomUUID()}@example.com`,
    );
    const providerSubject = `shared-subject-${randomUUID()}`;

    await persistence.externalAuthIdentityService.createIdentity({
      userId: firstUser.id,
      provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
      providerSubject,
      providerEmail: firstUser.email,
    });

    await assert.rejects(
      () =>
        persistence.externalAuthIdentityService.createIdentity({
          userId: secondUser.id,
          provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
          providerSubject,
          providerEmail: secondUser.email,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ApiException);
        assert.equal(error.errorCode, 'AUTH_EXTERNAL_IDENTITY_CONFLICT');
        return true;
      },
    );
  });

  it('enforces one identity per provider for a user', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const user = await createExternalOnlyUser(
      persistence,
      `one-provider-${randomUUID()}@example.com`,
    );

    await persistence.externalAuthIdentityService.createIdentity({
      userId: user.id,
      provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
      providerSubject: `subject-one-${randomUUID()}`,
      providerEmail: user.email,
    });

    await assert.rejects(
      () =>
        persistence.externalAuthIdentityService.createIdentity({
          userId: user.id,
          provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
          providerSubject: `subject-two-${randomUUID()}`,
          providerEmail: user.email,
        }),
      (error: unknown) => {
        assert.ok(error instanceof ApiException);
        assert.equal(error.errorCode, 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED');
        return true;
      },
    );
  });

  it('cascades identity deletion when the user is deleted', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const user = await createExternalOnlyUser(persistence, `cascade-${randomUUID()}@example.com`);
    const identity = await persistence.externalAuthIdentityService.createIdentity({
      userId: user.id,
      provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
      providerSubject: `cascade-subject-${randomUUID()}`,
      providerEmail: user.email,
    });

    await persistence.dataSource.getRepository(UserEntity).delete({ id: user.id });

    const remainingIdentity = await persistence.dataSource
      .getRepository(ExternalAuthIdentityEntity)
      .findOneBy({ id: identity.id });

    assert.equal(remainingIdentity, null);
  });

  it('fails concurrent duplicate inserts deterministically', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const firstUser = await createExternalOnlyUser(
      persistence,
      `race-a-${randomUUID()}@example.com`,
    );
    const secondUser = await createExternalOnlyUser(
      persistence,
      `race-b-${randomUUID()}@example.com`,
    );
    const providerSubject = `race-subject-${randomUUID()}`;

    const outcomes = await Promise.allSettled([
      persistence.externalAuthIdentityService.createIdentity({
        userId: firstUser.id,
        provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
        providerSubject,
        providerEmail: firstUser.email,
      }),
      persistence.externalAuthIdentityService.createIdentity({
        userId: secondUser.id,
        provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
        providerSubject,
        providerEmail: secondUser.email,
      }),
    ]);

    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);

    const rejection = rejected[0];
    assert.ok(rejection !== undefined && rejection.status === 'rejected');
    assert.ok(rejection.reason instanceof ApiException);
    assert.equal(rejection.reason.errorCode, 'AUTH_EXTERNAL_IDENTITY_CONFLICT');

    const storedIdentities = await persistence.dataSource
      .getRepository(ExternalAuthIdentityEntity)
      .findBy({
        provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
        providerSubject,
      });
    assert.equal(storedIdentities.length, 1);
  });

  it('does not store provider tokens or complete provider payloads', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const columns = await persistence.dataSource.query<{ column_name: string }[]>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'external_auth_identities'
        ORDER BY ordinal_position
      `,
    );

    assert.deepEqual(
      columns.map((column) => column.column_name),
      [
        'id',
        'user_id',
        'provider',
        'provider_subject',
        'provider_email',
        'created_at',
        'updated_at',
      ],
    );
  });

  it('rejects foreign keys that would orphan an identity', async (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    await assert.rejects(
      () =>
        persistence.dataSource.getRepository(ExternalAuthIdentityEntity).save(
          persistence.dataSource.getRepository(ExternalAuthIdentityEntity).create({
            userId: randomUUID(),
            provider: EXTERNAL_AUTH_PROVIDER_GOOGLE,
            providerSubject: `missing-user-${randomUUID()}`,
            providerEmail: 'missing@example.com',
          }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof QueryFailedError);
        const driverError = error.driverError;
        assert.ok(
          typeof driverError === 'object' &&
            driverError !== null &&
            'code' in driverError &&
            driverError.code === '23503',
        );
        return true;
      },
    );
  });

  it('registers the expected TypeORM entities for auth persistence', (testContext) => {
    const persistence = requirePersistence(testContext);
    if (persistence === null) {
      return;
    }

    const entityTableNames = persistence.dataSource.entityMetadatas
      .map((metadata) => metadata.tableName)
      .sort();

    assert.ok(entityTableNames.includes('users'));
    assert.ok(entityTableNames.includes('refresh_sessions'));
    assert.ok(entityTableNames.includes('external_auth_identities'));
    assert.ok(persistence.dataSource.hasMetadata(RefreshSessionEntity));
  });
});
