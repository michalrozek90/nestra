import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import type { GoogleAuthExchangeRequest } from '@nestra/contracts';

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

describe('GoogleAuthService protocol behavior', () => {
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
    const handoffVerifier = createExternalAuthRandomValue();
    const handoffSecret = createExternalAuthRandomValue();
    const transactionId = '11111111-1111-4111-8111-111111111111';
    const handoffCode = `${transactionId}.${handoffSecret}`;
    const claimsCiphertext = encryptExternalAuthPayload(
      { subject: 'google-sub', email: 'user@example.com' },
      encryptionKey,
      transactionId,
      'google',
      'sign_in',
    );
    const transaction = createTransaction({
      status: 'pending_handoff',
      handoffChallenge: createPkceChallenge(handoffVerifier),
      handoffCodeHash: hashExternalAuthValue(handoffCode),
      handoffExpiresAt: new Date(Date.now() + 60_000),
      validatedClaimsCiphertext: claimsCiphertext,
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
        createSession: async () => ({
          user: {
            id: 'user-id',
            email: 'user@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: 'access',
          refreshToken: 'refresh',
          accessTokenExpiresAt: new Date().toISOString(),
          refreshSessionExpiresAt: new Date().toISOString(),
        }),
        findIdentity: async () => ({
          id: 'identity-id',
          user: {
            id: 'user-id',
            email: 'user@example.com',
            passwordHash: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      },
    );

    const request: GoogleAuthExchangeRequest = { handoffCode, handoffVerifier };
    await service.exchangeSignIn(request);
    assert.equal(transaction.status, 'consumed');

    await assert.rejects(
      () => service.exchangeSignIn(request),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_HANDOFF_ALREADY_USED',
    );
  });

  it('returns cancelled outcomes after committing handoff consumption', async () => {
    const handoffVerifier = createExternalAuthRandomValue();
    const handoffSecret = createExternalAuthRandomValue();
    const transactionId = '11111111-1111-4111-8111-111111111111';
    const handoffCode = `${transactionId}.${handoffSecret}`;
    const transaction = createTransaction({
      status: 'pending_handoff',
      handoffChallenge: createPkceChallenge(handoffVerifier),
      handoffCodeHash: hashExternalAuthValue(handoffCode),
      handoffExpiresAt: new Date(Date.now() + 60_000),
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
      () => service.exchangeSignIn({ handoffCode, handoffVerifier }),
      (error: unknown) =>
        error instanceof ApiException && error.errorCode === 'AUTH_GOOGLE_CANCELLED',
    );
    assert.equal(transaction.status, 'consumed');
  });
});

type TransactionRepositoryMock = {
  findOne: (options: unknown) => Promise<MutableTransaction | null>;
  update: (criteria: unknown, values: Record<string, unknown>) => Promise<{ affected: number }>;
};

function createService(
  transactionRepository: TransactionRepositoryMock,
  options: {
    encryptionKey?: Buffer<ArrayBuffer>;
    googleClient?: GoogleOAuthClient;
    createSession?: () => Promise<unknown>;
    findIdentity?: () => Promise<unknown>;
  } = {},
): GoogleAuthService {
  const encryptionKey = options.encryptionKey ?? Buffer.from(randomBytes(32));
  const googleOAuth = createEnabledConfig(encryptionKey);
  const identityStore = {
    findOne: async () => (options.findIdentity ? options.findIdentity() : null),
    update: async () => ({ affected: 1 }),
  };
  const userStore = {
    findOne: async () => null,
    create: (value: unknown) => value,
    save: async (value: unknown) => value,
  };

  const resolveRepository = (entity: unknown) => {
    if (entity === ExternalAuthTransactionEntity) {
      return transactionRepository;
    }
    if (entity === UserEntity) {
      return userStore;
    }
    if (entity === ExternalAuthIdentityEntity) {
      return identityStore;
    }
    return identityStore;
  };

  const dataSource = {
    getRepository: resolveRepository,
    transaction: async <T>(callback: (entityManager: unknown) => Promise<T>): Promise<T> => {
      return callback({ getRepository: resolveRepository });
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
    verifyPassword: async () => true,
  };
  const authService = {
    createSessionForUser:
      options.createSession ??
      (async () => {
        throw new Error('unexpected session creation');
      }),
  };
  const identityService = {
    createIdentity: async () => {
      throw new Error('unexpected identity creation');
    },
  };

  return new GoogleAuthService(
    transactionRepository as never,
    configService as never,
    googleClient,
    passwordService as never,
    authService as never,
    identityService as never,
    dataSource as never,
  );
}
