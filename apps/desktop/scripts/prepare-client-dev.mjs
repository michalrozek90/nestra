import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyEnvFile } from './load-env-file.mjs';
import { runCommand } from './run-command.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(desktopPackageDirectory, '../..');
const clientPackageDirectory = path.resolve(repositoryRoot, 'apps/client');
const localEnvPath = path.join(clientPackageDirectory, '.env');
const localEnvExamplePath = path.join(clientPackageDirectory, '.env.example');

if (!existsSync(localEnvPath)) {
  console.error(
    [
      'Missing apps/client/.env for desktop development.',
      `Copy ${path.relative(repositoryRoot, localEnvExamplePath)} to apps/client/.env`,
      'Use the local API URL for local backends, or the hosted demo URL from',
      'apps/client/.env.desktop.example when the desktop client should call the hosted API.',
    ].join('\n'),
  );
  process.exit(1);
}

applyEnvFile(localEnvPath);

runCommand('pnpm', ['--filter', '@nestra/client', 'dev:web'], {
  cwd: repositoryRoot,
  env: process.env,
});
