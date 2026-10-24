import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiException } from '../common/api.exception';
import { DatabaseConnectionService } from '../database/database-connection.service';
import { RefreshSessionEntity } from './entities/refresh-session.entity';

@Injectable()
export class RefreshSessionAccessService {
  constructor(
    @InjectRepository(RefreshSessionEntity)
    private readonly refreshSessionRepository: Repository<RefreshSessionEntity>,
    private readonly databaseConnectionService: DatabaseConnectionService,
  ) {}

  async assertActive(userId: string, sessionId: string): Promise<void> {
    await this.databaseConnectionService.waitForConnection();
    const refreshSession = await this.refreshSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (refreshSession === null || refreshSession.revokedAt !== null) {
      throw new ApiException(
        'AUTH_ACCESS_TOKEN_INVALID',
        'The access token is invalid.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
