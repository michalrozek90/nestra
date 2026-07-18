import { Logger } from '@nestjs/common';

import applicationDataSource, { apiEnvironment } from './data-source';

const logger = new Logger('DatabaseSeed');

async function seedDatabase(): Promise<void> {
  if (apiEnvironment.nodeEnvironment === 'production') {
    logger.error('Database seed is disabled in production.');
    process.exitCode = 1;
    return;
  }

  await applicationDataSource.initialize();

  try {
    logger.log('No Stage 3 seed records are required.');
  } finally {
    await applicationDataSource.destroy();
  }
}

seedDatabase().catch((error: unknown) => {
  const safeErrorName = error instanceof Error ? error.name : 'UnknownError';

  logger.error(`Database seed failed (${safeErrorName}).`);
  process.exitCode = 1;
});
