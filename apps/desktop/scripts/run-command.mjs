import { spawnSync } from 'node:child_process';

export function runCommand(command, args, options = {}) {
  // Windows needs a shell to resolve `.cmd` / PATH shims such as pnpm.
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const exitCode = result.status ?? 1;
    throw new Error(`Command failed with exit code ${exitCode}: ${command} ${args.join(' ')}`);
  }
}
