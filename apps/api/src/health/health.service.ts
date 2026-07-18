import { Injectable, Logger } from '@nestjs/common';
import { applicationVersion, healthResponseSchema, type HealthResponse } from '@nestra/contracts';

import { DatabaseConnectionService } from '../database/database-connection.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly databaseConnectionService: DatabaseConnectionService) {}

  async getHealth(): Promise<HealthResponse> {
    try {
      await this.databaseConnectionService.verifyConnection();

      return healthResponseSchema.parse({
        status: 'ok',
        database: 'reachable',
        version: applicationVersion,
        timestamp: new Date().toISOString(),
      });
    } catch {
      this.logger.warn('Database health check failed.');

      return healthResponseSchema.parse({
        status: 'degraded',
        database: 'unreachable',
        version: applicationVersion,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
