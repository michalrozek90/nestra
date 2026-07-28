import { copyFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyEnvFile } from './load-env-file.mjs';
import { runCommand } from './run-command.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(desktopPackageDirectory, '../..');
const clientPackageDirectory = path.resolve(repositoryRoot, 'apps/client');
const desktopEnvPath = path.join(clientPackageDirectory, '.env.desktop');
const desktopEnvExamplePath = path.join(clientPackageDirectory, '.env.desktop.example');
const clientEnvPath = path.join(clientPackageDirectory, '.env');
const clientEnvBackupPath = path.join(clientPackageDirectory, '.env.desktop-build-backup');

if (!existsSync(desktopEnvPath)) {
  console.error(
    [
      'Missing apps/client/.env.desktop for the desktop production web build.',
      `Copy ${path.relative(repositoryRoot, desktopEnvExamplePath)} to apps/client/.env.desktop`,
      'and keep the API base URL pointed at the hosted demonstration endpoint',
      '(or another explicit HTTPS API URL you control).',
    ].join('\n'),
  );
  process.exit(1);
}

/**
 * Expo loads apps/client/.env during export and that file wins over process.env for
 * EXPO_PUBLIC_* values. Temporarily replace it with .env.desktop for the packaged build.
 */
function withDesktopClientEnv(build) {
  const hadClientEnv = existsSync(clientEnvPath);
  let replacedClientEnv = false;

  try {
    applyEnvFile(desktopEnvPath);

    if (hadClientEnv) {
      renameSync(clientEnvPath, clientEnvBackupPath);
    }

    copyFileSync(desktopEnvPath, clientEnvPath);
    replacedClientEnv = true;

    return build();
  } finally {
    if (replacedClientEnv && existsSync(clientEnvPath)) {
      unlinkSync(clientEnvPath);
    }

    if (hadClientEnv && existsSync(clientEnvBackupPath)) {
      renameSync(clientEnvBackupPath, clientEnvPath);
    }
  }
}

withDesktopClientEnv(() => {
  runCommand('pnpm', ['--filter', '@nestra/contracts', 'build'], {
    cwd: repositoryRoot,
    env: process.env,
  });

  runCommand('pnpm', ['--filter', '@nestra/client', 'build'], {
    cwd: repositoryRoot,
    env: process.env,
  });
});
