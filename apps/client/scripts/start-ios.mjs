import { spawnSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  process.stderr.write('The iOS simulator requires macOS and Xcode.\n');
  process.exit(1);
}

const result = spawnSync('pnpm', ['exec', 'expo', 'start', '--ios'], {
  stdio: 'inherit',
});

if (result.error !== undefined) {
  throw result.error;
}

process.exit(result.status ?? 1);
