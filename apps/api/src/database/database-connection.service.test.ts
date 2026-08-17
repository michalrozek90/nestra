import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DatabaseConnectionService } from './database-connection.service';

describe('DatabaseConnectionService', () => {
  it('waits for pending metadata initialization before allowing concurrent access', async () => {
    let completeInitialization: (() => void) | undefined;
    let markInitializationStarted: (() => void) | undefined;
    let initializationCount = 0;
    const initializationStarted = new Promise<void>((resolve) => {
      markInitializationStarted = resolve;
    });
    const initializationCanComplete = new Promise<void>((resolve) => {
      completeInitialization = resolve;
    });
    const dataSource = {
      isInitialized: false,
      initialize: async () => {
        initializationCount += 1;
        dataSource.isInitialized = true;
        markInitializationStarted?.();
        await initializationCanComplete;
        return dataSource;
      },
    };
    const service = new DatabaseConnectionService(dataSource as never);

    const firstInitialization = service.ensureInitialized();
    await initializationStarted;

    let didConcurrentInitializationFinish = false;
    const concurrentInitialization = service.ensureInitialized().then(() => {
      didConcurrentInitializationFinish = true;
    });
    await Promise.resolve();

    assert.equal(dataSource.isInitialized, true);
    assert.equal(didConcurrentInitializationFinish, false);
    assert.equal(initializationCount, 1);

    completeInitialization?.();
    await Promise.all([firstInitialization, concurrentInitialization]);

    assert.equal(didConcurrentInitializationFinish, true);
  });
});
