import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { DatabaseUnavailableException } from './database-unavailable.exception';

const databaseConnectionTimeoutMs = 3_000;

@Injectable()
export class DatabaseConnectionService {
  private initializationPromise: Promise<void> | undefined;

  constructor(private readonly dataSource: DataSource) {}

  async verifyConnection(): Promise<void> {
    try {
      await this.withTimeout(this.ensureInitialized(), databaseConnectionTimeoutMs);
      await this.withTimeout(
        this.dataSource.query('SELECT 1').then(() => undefined),
        databaseConnectionTimeoutMs,
      );
    } catch (error: unknown) {
      throw new DatabaseUnavailableException(error);
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.dataSource.isInitialized) {
      return;
    }

    const pendingInitialization = this.initializationPromise;

    if (pendingInitialization !== undefined) {
      await pendingInitialization;
      return;
    }

    const initializationPromise = this.dataSource.initialize().then(() => undefined);
    this.initializationPromise = initializationPromise;

    try {
      await initializationPromise;
    } finally {
      if (this.initializationPromise === initializationPromise) {
        this.initializationPromise = undefined;
      }
    }
  }

  private async withTimeout(operation: Promise<void>, timeoutMs: number): Promise<void> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('Database health check timed out.'));
      }, timeoutMs);
    });

    try {
      await Promise.race([operation, timeout]);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
