import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from './run-command.mjs';

const [, , ...tauriArguments] = process.argv;

if (tauriArguments.length === 0) {
  console.error('Usage: node ./scripts/run-tauri.mjs <tauri-args...>');
  process.exit(1);
}

if (process.platform !== 'win32') {
  console.error(
    'Nestra desktop commands currently target Windows x64 only. Run them on a Windows development machine.',
  );
  process.exit(1);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageDirectory = path.resolve(scriptDirectory, '..');

runCommand('pnpm', ['exec', 'tauri', ...tauriArguments], {
  cwd: desktopPackageDirectory,
  env: process.env,
});
