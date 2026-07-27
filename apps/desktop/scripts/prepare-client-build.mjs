import { existsSync } from 'node:fs';
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

applyEnvFile(desktopEnvPath);

runCommand('pnpm', ['--filter', '@nestra/contracts', 'build'], {
  cwd: repositoryRoot,
  env: process.env,
});

runCommand('pnpm', ['--filter', '@nestra/client', 'build'], {
  cwd: repositoryRoot,
  env: process.env,
});
