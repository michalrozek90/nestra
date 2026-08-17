import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import type { GoogleAuthExchangeRequest } from '@nestra/contracts';
import { EntityMetadataNotFoundError, QueryFailedError } from 'typeorm';

import { ApiException } from '../common/api.exception';
import type { ApiEnvironment } from '../config/api-environment';
import { ExternalAuthIdentityEntity } from './entities/external-auth-identity.entity';
import { ExternalAuthTransactionEntity } from './entities/external-auth-transaction.entity';
import { UserEntity } from './entities/user.entity';
import {
  createExternalAuthRandomValue,
  createPkceChallenge,
  encryptExternalAuthPayload,
  hashExternalAuthValue,
} from './external-auth-transaction.crypto';
import { GoogleAuthService } from './google-auth.service';
import type { GoogleOAuthClient, VerifiedGoogleIdentity } from './google-oauth.client';
import { GoogleOAuthVerificationError } from './google-oauth.errors';

type MutableTransaction = ExternalAuthTransactionEntity;

type SessionResponse = {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshSessionExpiresAt: string;
};

type IdentityRecord = {
  readonly id: string;
  readonly userId: string;
  readonly provider: 'google';
  readonly providerSubject: string;
  providerEmail: string;
  readonly createdAt: Date;
  readonly user: UserEntity;
};

function createEnabledConfig(
  encryptionKey: Buffer<ArrayBuffer>,
): Extract<ApiEnvironment['googleOAuth'], { enabled: true }> {
  return {
    enabled: true,
    clientId: 'client-id',
    clientSecret: 'client-secret',
    callbackUri: 'http://localhost:3000/api/v1/auth/google/callback',
    transactionEncryptionKey: encryptionKey,
    returnUris: {
      web: 'http://localhost:8081/auth/google/callback',
      android: 'com.michalrozek.nestra:/oauth/google',
      ios: 'com.michalrozek.nestra:/oauth/google',
      desktop: 'com.michalrozek.nestra.desktop:/oauth/google',
    },
  };
}

function createTransaction(overrides: Partial<MutableTransaction> = {}): MutableTransaction {
  const now = Date.now();
  return {
    id: '11111111-1111-4111-8111-111111111111',
    provider: 'google',
    intent: 'sign_in',
    platform: 'web',
    userId: null,
    user: null,
    returnUri: 'http://localhost:8081/auth/google/callback',
    stateHash: hashExternalAuthValue('state-value'),
    requestSecretsCiphertext: null,
    handoffChallenge: createPkceChallenge('handoff-verifier-value-0123456789abcd'),
    handoffCodeHash: null,
    validatedClaimsCiphertext: null,
    status: 'pending_provider',
    processingLeaseExpiresAt: null,
    outcomeErrorCode: null,
    providerExpiresAt: new Date(now + 10 * 60 * 1000),
    handoffExpiresAt: null,
    consumedAt: null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    ...overrides,
  };
}

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const now = new Date();
  return {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    refreshSessions: [],
    externalAuthIdentities: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createSession(user: UserEntity): SessionResponse {
  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    accessToken: 'access',
    refreshToken: 'refresh',
    accessTokenExpiresAt: new Date().toISOString(),
    refreshSessionExpiresAt: new Date().toISOString(),
  };
}

function createPendingHandoff(options: {
  readonly encryptionKey: Buffer<ArrayBuffer>;
  readonly subject?: string;
  readonly email?: string;
  readonly intent?: 'sign_in' | 'link';
  readonly userId?: string | null;
  readonly outcomeErrorCode?: string | null;
}): {
  readonly transaction: MutableTransaction;
  readonly request: GoogleAuthExchangeRequest;
} {
  const handoffVerifier = createExternalAuthRandomValue();
  const handoffSecret = createExternalAuthRandomValue();
  const transactionId = '11111111-1111-4111-8111-111111111111';
  const handoffCode = `${transactionId}.${handoffSecret}`;
  const intent = options.intent ?? 'sign_in';
  const subject = options.subject ?? 'google-sub';
  const email = options.email ?? 'user@example.com';
  const claimsCiphertext =
    options.outcomeErrorCode === undefined || options.outcomeErrorCode === null
      ? encryptExternalAuthPayload(
          { subject, email },
          options.encryptionKey,
          transactionId,
          'google',
          intent,
        )
      : null;

  return {
    transaction: createTransaction({
      intent,
      userId: options.userId ?? null,
      status: 'pending_handoff',
      handoffChallenge: createPkceChallenge(handoffVerifier),
      handoffCodeHash: hashExternalAuthValue(handoffCode),
      handoffExpiresAt: new Date(Date.now() + 60_000),
      validatedClaimsCiphertext: claimsCiphertext,
      outcomeErrorCode: options.outcomeErrorCode ?? null,
    }),
    request: { handoffCode, handoffVerifier },
  };
}

function createUniqueEmailViolation(): QueryFailedError {
  return new QueryFailedError('INSERT', [], {
    code: '23505',
    constraint: 'users_email_unique',
  } as never);
}

describe('GoogleAuthService protocol behavior', () => {
  it('initializes the database before the first Google sign-in transaction access', async () => {
    let isDatabaseInitialized = false;
    const service = createService(
      {
        findOne: async () => null,
        update: async () => ({ affected: 1 }),
        create: (transaction) => createTransaction(transaction),
        save: async (transaction) => transaction,
      },
      {
        ensureDatabaseInitialized: async () => {
          isDatabaseInitialized = true;
        },
        scrubExpiredTransactions: async () => {
          if (!isDatabaseInitialized) {
            throw new EntityMetadataNotFoundError(ExternalAuthTransactionEntity);
          }
        },
      },
    );

    const response = await service.startSignIn(
      'web',
      createPkceChallenge(createExternalAuthRandomValue()),
    );

    assert.equal(isDatabaseInitialized, true);
    assert.equal(response.transactionId, '11111111-1111-4111-8111-111111111111');
    assert.equal(response.authorizationUrl, 'https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('rejects unknown callback state without redirecting', async () => {
    const service = createService({
      findOne: async () => null,
      update: async () => ({ affected: 0 }),
    });

    const result = await service.handleCallback({ state: 'unknown' });
    assert.deepEqual(result, { kind: 'error' });
  });

  it('publishes a cancelled handoff for access_denied after claiming state', async () => {
    const transaction = createTransaction();
    const updates: Array<Record<string, unknown>> = [];
    const service = createService({
      findOne: async () => transaction,
      update: async (_criteria, values) => {
        updates.push(values);
        Object.assign(transaction, values);
        return { affected: 1 };
      },
    });

    const result = await service.handleCallback({
      state: 'state-value',
      error: 'access_denied',
    });

    assert.equal(result.kind, 'redirect');
    if (result.kind !== 'redirect') {
      assert.fail('expected redirect');
    }
    assert.equal(result.returnUri, transaction.returnUri);
    assert.match(result.handoffCode, /^11111111-1111-4111-8111-111111111111\./);
    assert.equal(updates.at(-1)?.outcomeErrorCode, 'AUTH_GOOGLE_CANCELLED');
    assert.equal(updates.at(-1)?.status, 'pending_handoff');
  });

  it('publishes unverified-email outcomes from Google verification failures', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const pkceVerifier = createExternalAuthRandomValue();
    const nonce = createExternalAuthRandomValue();
    const transaction = createTransaction({
      requestSecretsCiphertext: encryptExternalAuthPayload(
        { pkceVerifier, nonce },
        encryptionKey,
        '11111111-1111-4111-8111-111111111111',
        'google',
        'sign_in',
      ),
    });
    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        googleClient: {
          createAuthorizationUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
          exchangeAndVerifyCode: async () => {
            throw new GoogleOAuthVerificationError('unverified_email');
          },
        },
      },
    );

    const result = await service.handleCallback({
      state: 'state-value',
      code: 'provider-code',
    });

    assert.equal(result.kind, 'redirect');
    assert.equal(transaction.outcomeErrorCode, 'AUTH_GOOGLE_EMAIL_UNVERIFIED');
  });

  it('rejects replayed handoffs after successful consumption', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const { transaction, request } = createPendingHandoff({ encryptionKey });
    const user = createUser({ passwordHash: null });
    const identity: IdentityRecord = {
      id: 'identity-id',
      userId: user.id,
      provider: 'google',
      providerSubject: 'google-sub',
      providerEmail: 'old@example.com',
      createdAt: new Date(),
      user,
    };

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => identity,
        updateProviderEmail: async (target, email) => {
          target.providerEmail = email;
        },
        createSession: async (sessionUser) => createSession(sessionUser),
      },
    );

    await service.exchangeSignIn(request);
    assert.equal(transaction.status, 'consumed');

    await assert.rejects(
      () => service.exchangeSignIn(request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_HANDOFF_ALREADY_USED',
    );
  });

  it('returns cancelled outcomes after committing handoff consumption', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      outcomeErrorCode: 'AUTH_GOOGLE_CANCELLED',
    });

    const service = createService({
      findOne: async () => transaction,
      update: async (_criteria, values) => {
        Object.assign(transaction, values);
        return { affected: 1 };
      },
    });

    await assert.rejects(
      () => service.exchangeSignIn(request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_CANCELLED',
    );
    assert.equal(transaction.status, 'consumed');
  });
});

describe('GoogleAuthService account provisioning and linking', () => {
  it('signs returning Google users in only by stored provider subject', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const user = createUser({
      email: 'canonical@example.com',
      passwordHash: null,
    });
    const identity: IdentityRecord = {
      id: 'identity-id',
      userId: user.id,
      provider: 'google',
      providerSubject: 'google-sub',
      providerEmail: 'previous-google@example.com',
      createdAt: new Date(),
      user,
    };
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      email: 'changed-google@example.com',
    });
    let updatedProviderEmail: string | null = null;
    let sessionUserEmail: string | null = null;
    let createdUsers = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => identity,
        updateProviderEmail: async (_target, email) => {
          updatedProviderEmail = email;
        },
        findUserByEmail: async () => {
          assert.fail('email must not be used to resolve returning Google users');
        },
        createUser: async () => {
          createdUsers += 1;
          return user;
        },
        createSession: async (sessionUser) => {
          sessionUserEmail = sessionUser.email;
          return createSession(sessionUser);
        },
      },
    );

    const session = await service.exchangeSignIn(request);

    assert.equal(session.user.id, user.id);
    assert.equal(sessionUserEmail, 'canonical@example.com');
    assert.equal(updatedProviderEmail, 'changed-google@example.com');
    assert.equal(createdUsers, 0);
    assert.equal(user.email, 'canonical@example.com');
  });

  it('provisions a new external-only user and identity when the email is free', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const { transaction, request } = createPendingHandoff({ encryptionKey });
    const createdIdentities: Array<Record<string, unknown>> = [];

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => null,
        findUserByEmail: async () => null,
        createUser: async (input) =>
          createUser({
            id: '33333333-3333-4333-8333-333333333333',
            email: input.email,
            passwordHash: input.passwordHash,
          }),
        createIdentity: async (input) => {
          createdIdentities.push(input);
          return {
            id: 'identity-new',
            userId: input.userId,
            provider: 'google',
            providerSubject: input.providerSubject,
            providerEmail: input.providerEmail,
            createdAt: new Date(),
            user: createUser({ id: input.userId, email: input.providerEmail, passwordHash: null }),
          };
        },
        createSession: async (sessionUser) => createSession(sessionUser),
      },
    );

    const session = await service.exchangeSignIn(request);

    assert.equal(session.user.email, 'user@example.com');
    assert.equal(createdIdentities.length, 1);
    assert.equal(createdIdentities[0]?.providerSubject, 'google-sub');
    assert.equal(createdIdentities[0]?.providerEmail, 'user@example.com');
    assert.equal(createdIdentities[0]?.userId, '33333333-3333-4333-8333-333333333333');
  });

  it('never silently links or signs into a password account on email collision', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const existingPasswordUser = createUser();
    const { transaction, request } = createPendingHandoff({ encryptionKey });
    let createdUsers = 0;
    let createdSessions = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => null,
        findUserByEmail: async () => existingPasswordUser,
        createUser: async () => {
          createdUsers += 1;
          return existingPasswordUser;
        },
        createSession: async (sessionUser) => {
          createdSessions += 1;
          return createSession(sessionUser);
        },
      },
    );

    await assert.rejects(
      () => service.exchangeSignIn(request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_ACCOUNT_LINK_REQUIRED',
    );
    assert.equal(createdUsers, 0);
    assert.equal(createdSessions, 0);
  });

  it('recovers concurrent subject provisioning through exact provider-subject re-read', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const { transaction, request } = createPendingHandoff({ encryptionKey });
    const winner = createUser({
      id: '44444444-4444-4444-8444-444444444444',
      email: 'user@example.com',
      passwordHash: null,
    });
    const winnerIdentity: IdentityRecord = {
      id: 'winner-identity',
      userId: winner.id,
      provider: 'google',
      providerSubject: 'google-sub',
      providerEmail: 'user@example.com',
      createdAt: new Date(),
      user: winner,
    };
    let subjectLookups = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => {
          subjectLookups += 1;
          return subjectLookups === 1 ? null : winnerIdentity;
        },
        findUserByEmail: async () => null,
        createUser: async (input) =>
          createUser({
            id: '55555555-5555-4555-8555-555555555555',
            email: input.email,
            passwordHash: null,
          }),
        createIdentity: async () => {
          throw new ApiException(
            'AUTH_EXTERNAL_IDENTITY_CONFLICT',
            'This Google identity cannot be linked.',
            409,
          );
        },
        createSession: async (sessionUser) => createSession(sessionUser),
      },
    );

    const session = await service.exchangeSignIn(request);
    assert.equal(session.user.id, winner.id);
    assert.equal(subjectLookups, 2);
  });

  it('maps concurrent email uniqueness conflicts to account-link-required', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const { transaction, request } = createPendingHandoff({ encryptionKey });

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => null,
        findUserByEmail: async () => null,
        createUser: async () => {
          throw createUniqueEmailViolation();
        },
        createSession: async (sessionUser) => createSession(sessionUser),
      },
    );

    await assert.rejects(
      () => service.exchangeSignIn(request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_ACCOUNT_LINK_REQUIRED',
    );
  });

  it('requires password reauthentication before starting an account link', async () => {
    const passwordChecks: Array<{ password: string; hash: string | null }> = [];
    const googleOnlyUser = createUser({ passwordHash: null });

    const service = createService(
      {
        findOne: async () => null,
        update: async () => ({ affected: 0 }),
      },
      {
        findUserById: async () => googleOnlyUser,
        verifyPassword: async (password, passwordHash) => {
          passwordChecks.push({ password, hash: passwordHash });
          return passwordHash !== null;
        },
      },
    );

    await assert.rejects(
      () =>
        service.startLink(
          googleOnlyUser.id,
          'any-password',
          'web',
          createPkceChallenge(createExternalAuthRandomValue()),
        ),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_REAUTHENTICATION_FAILED',
    );
    assert.equal(passwordChecks.length, 1);
    assert.equal(passwordChecks[0]?.hash, null);
  });

  it('links Google only when authenticated ownership and emails match', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const user = createUser();
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      intent: 'link',
      userId: user.id,
    });
    const createdIdentities: Array<Record<string, unknown>> = [];

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findUserById: async () => user,
        createIdentity: async (input) => {
          createdIdentities.push(input);
          return {
            id: 'linked-identity',
            userId: input.userId,
            provider: 'google',
            providerSubject: input.providerSubject,
            providerEmail: input.providerEmail,
            createdAt: new Date('2026-08-04T12:00:00.000Z'),
            user,
          };
        },
      },
    );

    const identity = await service.exchangeLink(user.id, request);
    assert.deepEqual(identity, {
      provider: 'google',
      email: 'user@example.com',
      linkedAt: '2026-08-04T12:00:00.000Z',
    });
    assert.equal(createdIdentities.length, 1);
  });

  it('rejects linking when the Google email does not match the Nestra account', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const user = createUser({ email: 'nestra@example.com' });
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      intent: 'link',
      userId: user.id,
      email: 'other-google@example.com',
    });
    let createdIdentities = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findUserById: async () => user,
        createIdentity: async () => {
          createdIdentities += 1;
          throw new Error('unexpected identity creation');
        },
      },
    );

    await assert.rejects(
      () => service.exchangeLink(user.id, request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_EMAIL_MISMATCH',
    );
    assert.equal(createdIdentities, 0);
  });

  it('rejects unauthorized link exchange for a different authenticated user', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const boundUserId = '22222222-2222-4222-8222-222222222222';
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      intent: 'link',
      userId: boundUserId,
    });
    let createdIdentities = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        createIdentity: async () => {
          createdIdentities += 1;
          throw new Error('unexpected identity creation');
        },
      },
    );

    await assert.rejects(
      () => service.exchangeLink('99999999-9999-4999-8999-999999999999', request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_HANDOFF_INVALID',
    );
    assert.equal(createdIdentities, 0);
    assert.equal(transaction.status, 'pending_handoff');
  });

  it('leaves accounts unchanged when cancelled linking is consumed', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const user = createUser();
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      intent: 'link',
      userId: user.id,
      outcomeErrorCode: 'AUTH_GOOGLE_CANCELLED',
    });
    let createdIdentities = 0;

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findUserById: async () => user,
        createIdentity: async () => {
          createdIdentities += 1;
          throw new Error('unexpected identity creation');
        },
      },
    );

    await assert.rejects(
      () => service.exchangeLink(user.id, request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_CANCELLED',
    );
    assert.equal(createdIdentities, 0);
    assert.equal(transaction.status, 'consumed');
  });

  it('rejects linking an already-linked Google subject without revealing the other account', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const user = createUser();
    const { transaction, request } = createPendingHandoff({
      encryptionKey,
      intent: 'link',
      userId: user.id,
    });

    const service = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findUserById: async () => user,
        createIdentity: async () => {
          throw new ApiException(
            'AUTH_EXTERNAL_IDENTITY_CONFLICT',
            'This Google identity cannot be linked.',
            409,
          );
        },
      },
    );

    await assert.rejects(
      () => service.exchangeLink(user.id, request),
      (error: unknown) =>
        error instanceof ApiException &&
        error.errorCode === 'AUTH_EXTERNAL_IDENTITY_CONFLICT' &&
        !error.safeMessage.includes('22222222'),
    );
  });

  it('keeps Google-only accounts sign-in capable without password linking access', async () => {
    const encryptionKey = Buffer.from(randomBytes(32));
    const googleOnlyUser = createUser({ passwordHash: null });
    const identity: IdentityRecord = {
      id: 'identity-id',
      userId: googleOnlyUser.id,
      provider: 'google',
      providerSubject: 'google-sub',
      providerEmail: 'user@example.com',
      createdAt: new Date(),
      user: googleOnlyUser,
    };
    const { transaction, request } = createPendingHandoff({ encryptionKey });

    const signInService = createService(
      {
        findOne: async () => transaction,
        update: async (_criteria, values) => {
          Object.assign(transaction, values);
          return { affected: 1 };
        },
      },
      {
        encryptionKey,
        findIdentityBySubject: async () => identity,
        createSession: async (sessionUser) => createSession(sessionUser),
      },
    );
    const session = await signInService.exchangeSignIn(request);
    assert.equal(session.user.id, googleOnlyUser.id);

    const linkStartService = createService(
      {
        findOne: async () => null,
        update: async () => ({ affected: 0 }),
      },
      {
        findUserById: async () => googleOnlyUser,
        verifyPassword: async (_password, passwordHash) => passwordHash !== null,
      },
    );
    await assert.rejects(
      () =>
        linkStartService.startLink(
          googleOnlyUser.id,
          'password',
          'web',
          createPkceChallenge(createExternalAuthRandomValue()),
        ),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_REAUTHENTICATION_FAILED',
    );
  });
});

type TransactionRepositoryMock = {
  findOne: (options: unknown) => Promise<MutableTransaction | null>;
  update: (criteria: unknown, values: Record<string, unknown>) => Promise<{ affected: number }>;
  create?: (transaction: Partial<MutableTransaction>) => MutableTransaction;
  save?: (transaction: MutableTransaction) => Promise<MutableTransaction>;
};

function createService(
  transactionRepository: TransactionRepositoryMock,
  options: {
    encryptionKey?: Buffer<ArrayBuffer>;
    googleClient?: GoogleOAuthClient;
    createSession?: (user: UserEntity) => Promise<SessionResponse>;
    findIdentityBySubject?: (
      provider: string,
      providerSubject: string,
    ) => Promise<IdentityRecord | null>;
    updateProviderEmail?: (identity: IdentityRecord, email: string) => Promise<void>;
    createIdentity?: (input: {
      readonly userId: string;
      readonly provider: 'google';
      readonly providerSubject: string;
      readonly providerEmail: string;
    }) => Promise<IdentityRecord>;
    findUserByEmail?: (email: string) => Promise<UserEntity | null>;
    findUserById?: (userId: string) => Promise<UserEntity | null>;
    createUser?: (input: {
      readonly email: string;
      readonly passwordHash: string | null;
    }) => Promise<UserEntity>;
    verifyPassword?: (password: string, passwordHash: string | null) => Promise<boolean>;
    ensureDatabaseInitialized?: () => Promise<void>;
    scrubExpiredTransactions?: () => Promise<void>;
  } = {},
): GoogleAuthService {
  const encryptionKey = options.encryptionKey ?? Buffer.from(randomBytes(32));
  const googleOAuth = createEnabledConfig(encryptionKey);
  const userStore = {
    findOne: async (query: { where?: { id?: string; email?: string } }) => {
      if (query.where?.id !== undefined) {
        return options.findUserById ? options.findUserById(query.where.id) : null;
      }
      if (query.where?.email !== undefined) {
        return options.findUserByEmail ? options.findUserByEmail(query.where.email) : null;
      }
      return null;
    },
    create: (value: { email: string; passwordHash: string | null }) => value,
    save: async (value: { email: string; passwordHash: string | null }) => {
      if (!options.createUser) {
        throw new Error('unexpected user creation');
      }
      return options.createUser(value);
    },
  };

  const resolveRepository = (entity: unknown) => {
    if (entity === ExternalAuthTransactionEntity) {
      return transactionRepository;
    }
    if (entity === UserEntity) {
      return userStore;
    }
    if (entity === ExternalAuthIdentityEntity) {
      return {
        findOne: async () => null,
        update: async () => ({ affected: 1 }),
      };
    }
    return {
      findOne: async () => null,
      update: async () => ({ affected: 1 }),
    };
  };

  const dataSource = {
    getRepository: resolveRepository,
    transaction: async <T>(callback: (entityManager: unknown) => Promise<T>): Promise<T> => {
      return callback({
        getRepository: resolveRepository,
        query: async () => undefined,
      });
    },
  };

  const googleClient: GoogleOAuthClient = options.googleClient ?? {
    createAuthorizationUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    exchangeAndVerifyCode: async (): Promise<VerifiedGoogleIdentity> => ({
      subject: 'google-sub',
      email: 'user@example.com',
      nonce: 'nonce',
    }),
  };

  const configService = {
    get: () => googleOAuth,
  };
  const passwordService = {
    verifyPassword:
      options.verifyPassword ??
      (async () => {
        throw new Error('unexpected password verification');
      }),
  };
  const authService = {
    createSessionForUser:
      options.createSession ??
      (async () => {
        throw new Error('unexpected session creation');
      }),
  };
  const identityService = {
    findByProviderSubject:
      options.findIdentityBySubject ??
      (async () => {
        return null;
      }),
    updateProviderEmail:
      options.updateProviderEmail ??
      (async () => {
        return undefined;
      }),
    createIdentity:
      options.createIdentity ??
      (async () => {
        throw new Error('unexpected identity creation');
      }),
  };

  return new GoogleAuthService(
    transactionRepository as never,
    configService as never,
    googleClient,
    passwordService as never,
    authService as never,
    identityService as never,
    {
      scrubExpiredTransactions: options.scrubExpiredTransactions ?? (async () => undefined),
    } as never,
    {
      ensureInitialized: options.ensureDatabaseInitialized ?? (async () => undefined),
    } as never,
    dataSource as never,
  );
}
