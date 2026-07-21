import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthenticationSessionResponse, PublicUser } from '@nestra/contracts';
import { DataSource, type EntityManager, IsNull, QueryFailedError, Repository } from 'typeorm';

import { addDurationToDate } from '../common/duration';
import { getTimestampMilliseconds, toIsoDateTimeString } from '../common/date-time';
import { ApiException } from '../common/api.exception';
import type { ApiEnvironment } from '../config/api-environment';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { AccessTokenService } from './access-token.service';
import { normalizeEmail } from './email-normalization';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import { UserEntity } from './entities/user.entity';
import { PasswordService } from './password.service';
import {
  areTokenHashesEqual,
  buildRefreshToken,
  generateRefreshTokenSecret,
  hashRefreshToken,
  parseRefreshToken,
} from './refresh-token.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshSessionEntity)
    private readonly refreshSessionRepository: Repository<RefreshSessionEntity>,
    private readonly passwordService: PasswordService,
    private readonly accessTokenService: AccessTokenService,
    private readonly configService: ConfigService<ApiEnvironment, true>,
    private readonly databaseConnectionService: DatabaseConnectionService,
    private readonly dataSource: DataSource,
  ) {}

  async register(email: string, password: string): Promise<AuthenticationSessionResponse> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await this.passwordService.hashPassword(password);

    try {
      return await this.dataSource.transaction(async (entityManager) => {
        const transactionalUserRepository = entityManager.getRepository(UserEntity);
        const user = transactionalUserRepository.create({
          email: normalizedEmail,
          passwordHash,
        });
        const savedUser = await transactionalUserRepository.save(user);

        return this.createAuthenticationSession(savedUser, entityManager);
      });
    } catch (error: unknown) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ApiException(
          'AUTH_EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists.',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthenticationSessionResponse> {
    await this.databaseConnectionService.verifyConnection();
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      user?.passwordHash ?? null,
    );

    if (user === null || !isPasswordValid) {
      throw new ApiException(
        'AUTH_INVALID_CREDENTIALS',
        'The email or password is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.dataSource.transaction((entityManager) =>
      this.createAuthenticationSession(user, entityManager),
    );
  }

  async refresh(refreshToken: string): Promise<AuthenticationSessionResponse> {
    await this.databaseConnectionService.verifyConnection();
    const parsedRefreshToken = parseRefreshToken(refreshToken);

    if (parsedRefreshToken === null) {
      throw new ApiException(
        'AUTH_REFRESH_TOKEN_INVALID',
        'The refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const submittedTokenHash = hashRefreshToken(parsedRefreshToken.token);
    const refreshSession = await this.refreshSessionRepository.findOne({
      where: { id: parsedRefreshToken.sessionId },
      relations: { user: true },
    });

    if (refreshSession === null) {
      throw new ApiException(
        'AUTH_REFRESH_TOKEN_INVALID',
        'The refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (refreshSession.revokedAt !== null) {
      throw new ApiException(
        'AUTH_REFRESH_TOKEN_INVALID',
        'The refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (getTimestampMilliseconds(refreshSession.expiresAt) <= Date.now()) {
      throw new ApiException(
        'AUTH_SESSION_EXPIRED',
        'The authentication session has expired.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!areTokenHashesEqual(refreshSession.tokenHash, submittedTokenHash)) {
      throw new ApiException(
        'AUTH_REFRESH_TOKEN_INVALID',
        'The refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const nextRefreshTokenSecret = generateRefreshTokenSecret();
    const nextRefreshToken = buildRefreshToken(refreshSession.id, nextRefreshTokenSecret);
    const nextTokenHash = hashRefreshToken(nextRefreshToken);
    const rotationResult = await this.refreshSessionRepository.update(
      {
        id: refreshSession.id,
        tokenHash: refreshSession.tokenHash,
        revokedAt: IsNull(),
      },
      {
        tokenHash: nextTokenHash,
      },
    );

    if (rotationResult.affected !== 1) {
      throw new ApiException(
        'AUTH_REFRESH_TOKEN_INVALID',
        'The refresh token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.buildAuthenticationSessionResponse(
      refreshSession.user,
      refreshSession.id,
      nextRefreshToken,
      refreshSession.expiresAt,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await this.databaseConnectionService.verifyConnection();
    const parsedRefreshToken = parseRefreshToken(refreshToken);

    if (parsedRefreshToken === null) {
      return;
    }

    const submittedTokenHash = hashRefreshToken(parsedRefreshToken.token);
    const refreshSession = await this.refreshSessionRepository.findOne({
      where: { id: parsedRefreshToken.sessionId },
    });

    if (refreshSession === null || refreshSession.revokedAt !== null) {
      return;
    }

    if (getTimestampMilliseconds(refreshSession.expiresAt) <= Date.now()) {
      return;
    }

    if (!areTokenHashesEqual(refreshSession.tokenHash, submittedTokenHash)) {
      return;
    }

    await this.refreshSessionRepository.update(
      { id: refreshSession.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    await this.databaseConnectionService.verifyConnection();
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user === null) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.toPublicUser(user);
  }

  private async createAuthenticationSession(
    user: UserEntity,
    entityManager: EntityManager,
  ): Promise<AuthenticationSessionResponse> {
    const refreshSessionExpiresAt = addDurationToDate(
      new Date(),
      this.configService.get('refreshSessionExpiresIn', { infer: true }),
    );
    const refreshTokenSecret = generateRefreshTokenSecret();
    const transactionalRefreshSessionRepository = entityManager.getRepository(RefreshSessionEntity);
    const refreshSession = transactionalRefreshSessionRepository.create({
      userId: user.id,
      tokenHash: hashRefreshToken(
        buildRefreshToken(crypto.randomUUID(), generateRefreshTokenSecret()),
      ),
      expiresAt: refreshSessionExpiresAt,
    });

    const savedRefreshSession = await transactionalRefreshSessionRepository.save(refreshSession);
    const refreshToken = buildRefreshToken(savedRefreshSession.id, refreshTokenSecret);

    await transactionalRefreshSessionRepository.update(savedRefreshSession.id, {
      tokenHash: hashRefreshToken(refreshToken),
    });

    return this.buildAuthenticationSessionResponse(
      user,
      savedRefreshSession.id,
      refreshToken,
      refreshSessionExpiresAt,
    );
  }

  private async buildAuthenticationSessionResponse(
    user: UserEntity,
    sessionId: string,
    refreshToken: string,
    refreshSessionExpiresAt: Date,
  ): Promise<AuthenticationSessionResponse> {
    const accessToken = await this.accessTokenService.signAccessToken(user.id, sessionId);
    const accessTokenExpiresAt = await this.accessTokenService.getAccessTokenExpiresAt(accessToken);

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshSessionExpiresAt: toIsoDateTimeString(refreshSessionExpiresAt),
    };
  }

  private toPublicUser(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      createdAt: toIsoDateTimeString(user.createdAt),
      updatedAt: toIsoDateTimeString(user.updatedAt),
    };
  }

  private isUniqueEmailViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError;

    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23505'
    );
  }
}
