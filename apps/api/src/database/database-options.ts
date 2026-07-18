import { resolve } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

import { SnakeCaseNamingStrategy } from './snake-case-naming.strategy';

export function createDatabaseOptions(databaseUrl: string): DataSourceOptions {
  const databaseDirectory = __dirname.replaceAll('\\', '/');
  const sourceDirectory = resolve(__dirname, '..').replaceAll('\\', '/');

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [`${sourceDirectory}/**/*.entity.js`],
    migrations: [`${databaseDirectory}/migrations/*.js`],
    migrationsRun: false,
    migrationsTableName: 'migrations',
    namingStrategy: new SnakeCaseNamingStrategy(),
    synchronize: false,
  };
}
