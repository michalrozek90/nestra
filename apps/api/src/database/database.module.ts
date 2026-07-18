import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import type { ApiEnvironment } from '../config/api-environment';
import { DatabaseConnectionService } from './database-connection.service';
import { createDatabaseOptions } from './database-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnvironment, true>) => ({
        ...createDatabaseOptions(configService.get('databaseUrl', { infer: true })),
        manualInitialization: true,
      }),
    }),
  ],
  providers: [DatabaseConnectionService],
  exports: [DatabaseConnectionService, TypeOrmModule],
})
export class DatabaseModule {}
