import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  type AuthenticationSessionResponse,
  type ExternalIdentityResponse,
  type GoogleAuthExchangeRequest,
  type GoogleAuthPlatform,
  type GoogleAuthStartResponse,
} from '@nestra/contracts';
import {
  DataSource,
  type EntityManager,
  type FindOptionsWhere,
  QueryFailedError,
  Repository,
} from 'typeorm';

import { ApiException } from '../common/api.exception';
import type { ApiEnvironment } from '../config/api-environment';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { AuthService } from './auth.service';
import {
  EXTERNAL_AUTH_TRANSACTION_PROVIDER,
  HANDOFF_TTL_MS,
  PROCESSING_LEASE_TTL_MS,
  PROVIDER_TRANSACTION_TTL_MS,
  type ExternalAuthTransactionIntent,
} from './external-auth-transaction.constants';
import {
  areExternalAuthValuesEqual,
  createExternalAuthRandomValue,
  createPkceChallenge,
  decryptExternalAuthPayload,
  encryptExternalAuthPayload,
  hashExternalAuthValue,
  type GoogleRequestSecrets,
  type GoogleValidatedClaims,
} from './external-auth-transaction.crypto';
import { ExternalAuthTransactionMaintenanceService } from './external-auth-transaction.maintenance';
import { ExternalAuthIdentityEntity } from './entities/external-auth-identity.entity';
import { ExternalAuthTransactionEntity } from './entities/external-auth-transaction.entity';
import { UserEntity } from './entities/user.entity';
import { ExternalAuthIdentityService } from './external-auth-identity.service';
import { normalizeEmail } from './email-normalization';
import { GOOGLE_OAUTH_CLIENT, type GoogleOAuthClient } from './google-oauth.client';
import { GoogleOAuthVerificationError } from './google-oauth.errors';
import { PasswordService } from './password.service';

export type GoogleCallbackResult =
  | { readonly kind: 'error' }
  | { readonly kind: 'redirect'; readonly returnUri: string; readonly handoffCode: string };

type ConsumeResult =
  | { readonly kind: 'session'; readonly session: AuthenticationSessionResponse }
  | { readonly kind: 'identity'; readonly identity: ExternalIdentityResponse }
  | { readonly kind: 'outcome_error'; readonly errorCode: ApiErrorCode };

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    @InjectRepository(ExternalAuthTransactionEntity)
    private readonly transactionRepository: Repository<ExternalAuthTransactionEntity>,
    private readonly configService: ConfigService<ApiEnvironment, true>,
    @Inject(GOOGLE_OAUTH_CLIENT)
    private readonly googleOAuthClient: GoogleOAuthClient,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly identityService: ExternalAuthIdentityService,
    private readonly transactionMaintenanceService: ExternalAuthTransactionMaintenanceService,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async startSignIn(
    platform: GoogleAuthPlatform,
    handoffChallenge: string,
  ): Promise<GoogleAuthStartResponse> {
    await this.databaseConnectionService.ensureInitialized();
    return this.start('sign_in', platform, handoffChallenge, null);
  }

  async startLink(
    userId: string,
    currentPassword: string,
    platform: GoogleAuthPlatform,
    handoffChallenge: string,
  ): Promise<GoogleAuthStartResponse> {
    await this.databaseConnectionService.ensureInitialized();
    const user = await this.dataSource.getRepository(UserEntity).findOne({ where: { id: userId } });
    const passwordIsValid = await this.passwordService.verifyPassword(
      currentPassword,
      user?.passwordHash ?? null,
    );
    if (user === null || !passwordIsValid) {
      throw this.exception(
        'AUTH_REAUTHENTICATION_FAILED',
        'Current password verification failed.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.start('link', platform, handoffChallenge, userId);
  }

  async handleCallback(form: Readonly<Record<string, unknown>>): Promise<GoogleCallbackResult> {
    const state = typeof form.state === 'string' ? form.state : null;
    if (state === null) {
      return { kind: 'error' };
    }

    await this.databaseConnectionService.ensureInitialized();
    const transaction = await this.transactionRepository.findOne({
      where: { stateHash: hashExternalAuthValue(state) },
    });
    if (transaction === null || !this.canClaimProviderCallback(transaction)) {
      return { kind: 'error' };
    }

    const claimCriteria: FindOptionsWhere<ExternalAuthTransactionEntity> = {
      id: transaction.id,
      status: transaction.status,
    };
    const claimed = await this.transactionRepository.update(claimCriteria, {
      status: 'processing_provider',
      processingLeaseExpiresAt: new Date(Date.now() + PROCESSING_LEASE_TTL_MS),
    });
    if (claimed.affected !== 1) {
      return { kind: 'error' };
    }

    const providerError = typeof form.error === 'string' ? form.error : null;
    if (providerError !== null) {
      return this.publishCallbackOutcome(
        transaction,
        providerError === 'access_denied' ? 'AUTH_GOOGLE_CANCELLED' : 'AUTH_GOOGLE_PROVIDER_ERROR',
        null,
      );
    }

    const code = typeof form.code === 'string' ? form.code : null;
    if (code === null || transaction.requestSecretsCiphertext === null) {
      return this.publishCallbackOutcome(transaction, 'AUTH_GOOGLE_RESPONSE_INVALID', null);
    }

    const googleOAuth = this.getGoogleConfig();
    const secrets = decryptExternalAuthPayload<GoogleRequestSecrets>(
      transaction.requestSecretsCiphertext,
      googleOAuth.transactionEncryptionKey,
      transaction.id,
      transaction.provider,
      transaction.intent,
    );
    if (secrets === null) {
      return this.publishCallbackOutcome(transaction, 'AUTH_GOOGLE_RESPONSE_INVALID', null);
    }

    try {
      const identity = await this.googleOAuthClient.exchangeAndVerifyCode({
        code,
        pkceVerifier: secrets.pkceVerifier,
        expectedNonce: secrets.nonce,
      });
      return this.publishCallbackOutcome(transaction, null, {
        subject: identity.subject,
        email: normalizeEmail(identity.email),
      });
    } catch (error: unknown) {
      if (error instanceof GoogleOAuthVerificationError && error.reason === 'unverified_email') {
        return this.publishCallbackOutcome(transaction, 'AUTH_GOOGLE_EMAIL_UNVERIFIED', null);
      }
      return this.publishCallbackOutcome(transaction, 'AUTH_GOOGLE_RESPONSE_INVALID', null);
    }
  }

  async exchangeSignIn(request: GoogleAuthExchangeRequest): Promise<AuthenticationSessionResponse> {
    const result = await this.consume(request, 'sign_in', null);
    if (result.kind === 'outcome_error') {
      throw this.exception(
        result.errorCode,
        'Google authentication did not complete.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (result.kind !== 'session') {
      throw this.exception(
        'AUTH_GOOGLE_RESPONSE_INVALID',
        'Google identity validation failed.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return result.session;
  }

  async exchangeLink(
    userId: string,
    request: GoogleAuthExchangeRequest,
  ): Promise<ExternalIdentityResponse> {
    const result = await this.consume(request, 'link', userId);
    if (result.kind === 'outcome_error') {
      throw this.exception(
        result.errorCode,
        'Google authentication did not complete.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (result.kind !== 'identity') {
      throw this.exception(
        'AUTH_GOOGLE_RESPONSE_INVALID',
        'Google identity validation failed.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return result.identity;
  }

  private async start(
    intent: ExternalAuthTransactionIntent,
    platform: GoogleAuthPlatform,
    handoffChallenge: string,
    userId: string | null,
  ): Promise<GoogleAuthStartResponse> {
    const config = this.getGoogleConfig();
    await this.transactionMaintenanceService.scrubExpiredTransactions();
    const returnUri = config.returnUris[platform];
    const state = createExternalAuthRandomValue();
    const pkceVerifier = createExternalAuthRandomValue();
    const nonce = createExternalAuthRandomValue();
    const providerExpiresAt = new Date(Date.now() + PROVIDER_TRANSACTION_TTL_MS);

    const transaction = this.transactionRepository.create({
      provider: EXTERNAL_AUTH_TRANSACTION_PROVIDER,
      intent,
      platform,
      userId,
      returnUri,
      stateHash: hashExternalAuthValue(state),
      handoffChallenge,
      requestSecretsCiphertext: null,
      handoffCodeHash: null,
      validatedClaimsCiphertext: null,
      status: 'pending_provider',
      processingLeaseExpiresAt: null,
      outcomeErrorCode: null,
      providerExpiresAt,
      handoffExpiresAt: null,
      consumedAt: null,
    });
    const savedTransaction = await this.transactionRepository.save(transaction);
    const requestSecretsCiphertext = encryptExternalAuthPayload(
      { pkceVerifier, nonce },
      config.transactionEncryptionKey,
      savedTransaction.id,
      savedTransaction.provider,
      savedTransaction.intent,
    );
    await this.transactionRepository.update(savedTransaction.id, { requestSecretsCiphertext });

    this.logger.log(
      `operation=google_start provider=google intent=${intent} platform=${platform} transactionId=${savedTransaction.id}`,
    );

    return {
      transactionId: savedTransaction.id,
      authorizationUrl: this.googleOAuthClient.createAuthorizationUrl({
        state,
        pkceChallenge: createPkceChallenge(pkceVerifier),
        nonce,
      }),
      transactionExpiresAt: providerExpiresAt.toISOString(),
    };
  }

  private async publishCallbackOutcome(
    transaction: ExternalAuthTransactionEntity,
    outcomeErrorCode: string | null,
    claims: GoogleValidatedClaims | null,
  ): Promise<GoogleCallbackResult> {
    const handoffSecret = createExternalAuthRandomValue();
    const handoffCode = `${transaction.id}.${handoffSecret}`;
    const handoffExpiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
    const config = this.getGoogleConfig();
    const validatedClaimsCiphertext =
      claims === null
        ? null
        : encryptExternalAuthPayload(
            claims,
            config.transactionEncryptionKey,
            transaction.id,
            transaction.provider,
            transaction.intent,
          );
    const published = await this.transactionRepository.update(
      { id: transaction.id, status: 'processing_provider' },
      {
        status: 'pending_handoff',
        requestSecretsCiphertext: null,
        validatedClaimsCiphertext,
        handoffCodeHash: hashExternalAuthValue(handoffCode),
        handoffExpiresAt,
        processingLeaseExpiresAt: null,
        outcomeErrorCode,
      },
    );
    if (published.affected !== 1) {
      return { kind: 'error' };
    }
    return { kind: 'redirect', returnUri: transaction.returnUri, handoffCode };
  }

  private async consume(
    request: GoogleAuthExchangeRequest,
    expectedIntent: ExternalAuthTransactionIntent,
    expectedUserId: string | null,
  ): Promise<ConsumeResult> {
    const [transactionId, secret, ...extraParts] = request.handoffCode.split('.');
    if (transactionId === undefined || secret === undefined || extraParts.length > 0) {
      throw this.exception(
        'AUTH_GOOGLE_HANDOFF_INVALID',
        'The Google handoff is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.databaseConnectionService.ensureInitialized();
    return this.dataSource.transaction(async (entityManager) => {
      const transactionRepository = entityManager.getRepository(ExternalAuthTransactionEntity);
      const transaction = await transactionRepository.findOne({
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        transaction === null ||
        transaction.intent !== expectedIntent ||
        transaction.userId !== expectedUserId
      ) {
        throw this.exception(
          'AUTH_GOOGLE_HANDOFF_INVALID',
          'The Google handoff is invalid.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (transaction.status === 'consumed') {
        throw this.exception(
          'AUTH_GOOGLE_HANDOFF_ALREADY_USED',
          'The Google handoff was already used.',
          HttpStatus.CONFLICT,
        );
      }

      if (
        transaction.status !== 'pending_handoff' ||
        transaction.handoffExpiresAt === null ||
        transaction.handoffExpiresAt.getTime() <= Date.now()
      ) {
        throw this.exception(
          'AUTH_GOOGLE_HANDOFF_EXPIRED',
          'The Google handoff has expired.',
          HttpStatus.GONE,
        );
      }

      if (
        transaction.handoffCodeHash === null ||
        !areExternalAuthValuesEqual(
          transaction.handoffCodeHash,
          hashExternalAuthValue(request.handoffCode),
        ) ||
        !areExternalAuthValuesEqual(
          transaction.handoffChallenge,
          createPkceChallenge(request.handoffVerifier),
        )
      ) {
        throw this.exception(
          'AUTH_GOOGLE_HANDOFF_INVALID',
          'The Google handoff is invalid.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const outcomeErrorCode = transaction.outcomeErrorCode;
      const validatedClaimsCiphertext = transaction.validatedClaimsCiphertext;

      await transactionRepository.update(transaction.id, {
        status: 'consumed',
        consumedAt: new Date(),
        requestSecretsCiphertext: null,
        validatedClaimsCiphertext: null,
      });

      if (outcomeErrorCode !== null) {
        return {
          kind: 'outcome_error',
          errorCode: this.toApiErrorCode(outcomeErrorCode),
        };
      }

      if (validatedClaimsCiphertext === null) {
        throw this.exception(
          'AUTH_GOOGLE_RESPONSE_INVALID',
          'Google identity validation failed.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const claims = decryptExternalAuthPayload<GoogleValidatedClaims>(
        validatedClaimsCiphertext,
        this.getGoogleConfig().transactionEncryptionKey,
        transaction.id,
        transaction.provider,
        transaction.intent,
      );
      if (claims === null) {
        throw this.exception(
          'AUTH_GOOGLE_RESPONSE_INVALID',
          'Google identity validation failed.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (expectedIntent === 'sign_in') {
        return {
          kind: 'session',
          session: await this.resolveSignIn(claims, entityManager),
        };
      }

      return {
        kind: 'identity',
        identity: await this.resolveLink(claims, expectedUserId, entityManager),
      };
    });
  }

  private async resolveSignIn(
    claims: GoogleValidatedClaims,
    entityManager: EntityManager,
  ): Promise<AuthenticationSessionResponse> {
    const existingIdentity = await this.identityService.findByProviderSubject(
      'google',
      claims.subject,
      entityManager,
    );
    if (existingIdentity !== null) {
      return this.signInExistingGoogleIdentity(existingIdentity, claims.email, entityManager);
    }

    const userRepository = entityManager.getRepository(UserEntity);
    if ((await userRepository.findOne({ where: { email: claims.email } })) !== null) {
      throw this.accountLinkRequiredException();
    }

    // Savepoint keeps the outer handoff transaction usable after a unique-violation race.
    await entityManager.query('SAVEPOINT nestra_google_provision');
    try {
      const user = await userRepository.save(
        userRepository.create({ email: claims.email, passwordHash: null }),
      );
      await this.identityService.createIdentity(
        {
          userId: user.id,
          provider: 'google',
          providerSubject: claims.subject,
          providerEmail: claims.email,
        },
        entityManager,
      );
      await entityManager.query('RELEASE SAVEPOINT nestra_google_provision');
      return this.authService.createSessionForUser(user, entityManager);
    } catch (error: unknown) {
      await entityManager.query('ROLLBACK TO SAVEPOINT nestra_google_provision');

      const racedIdentity = await this.identityService.findByProviderSubject(
        'google',
        claims.subject,
        entityManager,
      );
      if (racedIdentity !== null) {
        return this.signInExistingGoogleIdentity(racedIdentity, claims.email, entityManager);
      }

      if (this.isUniqueEmailViolation(error)) {
        throw this.accountLinkRequiredException();
      }

      throw error;
    }
  }

  private async signInExistingGoogleIdentity(
    identity: ExternalAuthIdentityEntity,
    providerEmail: string,
    entityManager: EntityManager,
  ): Promise<AuthenticationSessionResponse> {
    await this.identityService.updateProviderEmail(identity, providerEmail, entityManager);
    return this.authService.createSessionForUser(identity.user, entityManager);
  }

  private accountLinkRequiredException(): ApiException {
    return this.exception(
      'AUTH_ACCOUNT_LINK_REQUIRED',
      'Link Google from the existing account.',
      HttpStatus.CONFLICT,
    );
  }

  private isUniqueEmailViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError;
    if (
      typeof driverError !== 'object' ||
      driverError === null ||
      !('code' in driverError) ||
      driverError.code !== '23505'
    ) {
      return false;
    }

    if (!('constraint' in driverError) || typeof driverError.constraint !== 'string') {
      return true;
    }

    return driverError.constraint === 'users_email_unique';
  }

  private async resolveLink(
    claims: GoogleValidatedClaims,
    userId: string | null,
    entityManager: EntityManager,
  ): Promise<ExternalIdentityResponse> {
    if (userId === null) {
      throw this.exception(
        'AUTH_GOOGLE_HANDOFF_INVALID',
        'The Google handoff is invalid.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await entityManager.getRepository(UserEntity).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (user === null || user.email !== claims.email) {
      throw this.exception(
        'AUTH_GOOGLE_EMAIL_MISMATCH',
        'The Google email must match this account.',
        HttpStatus.CONFLICT,
      );
    }

    const identity = await this.identityService.createIdentity(
      {
        userId,
        provider: 'google',
        providerSubject: claims.subject,
        providerEmail: claims.email,
      },
      entityManager,
    );

    return {
      provider: 'google',
      email: identity.providerEmail,
      linkedAt: identity.createdAt.toISOString(),
    };
  }

  private canClaimProviderCallback(transaction: ExternalAuthTransactionEntity): boolean {
    if (transaction.providerExpiresAt.getTime() <= Date.now()) {
      return false;
    }

    if (transaction.status === 'pending_provider') {
      return true;
    }

    return (
      transaction.status === 'processing_provider' &&
      transaction.processingLeaseExpiresAt !== null &&
      transaction.processingLeaseExpiresAt.getTime() <= Date.now()
    );
  }

  private getGoogleConfig(): Extract<ApiEnvironment['googleOAuth'], { enabled: true }> {
    const googleOAuth = this.configService.get('googleOAuth', { infer: true });
    if (!googleOAuth.enabled) {
      throw this.exception(
        'AUTH_GOOGLE_UNAVAILABLE',
        'Google authentication is unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return googleOAuth;
  }

  private toApiErrorCode(errorCode: string): ApiErrorCode {
    for (const knownErrorCode of API_ERROR_CODES) {
      if (knownErrorCode === errorCode) {
        return knownErrorCode;
      }
    }
    return 'AUTH_GOOGLE_PROVIDER_ERROR';
  }

  private exception(errorCode: ApiErrorCode, message: string, status: HttpStatus): ApiException {
    return new ApiException(errorCode, message, status);
  }
}
