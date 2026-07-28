import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertInstallerArtifact } from './installer-artifact.mjs';
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

// Keep Cargo artifacts outside the monorepo by default so Expo Metro does not
// watch rustc temporary files under apps/desktop/src-tauri/target.
// CI may override CARGO_TARGET_DIR to a workspace path for caching and uploads.
const localAppDataDirectory =
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
const defaultCargoTargetDirectory = path.join(
  localAppDataDirectory,
  'nestra',
  'desktop-cargo-target',
);
const cargoTargetDirectory = process.env.CARGO_TARGET_DIR ?? defaultCargoTargetDirectory;

runCommand('pnpm', ['exec', 'tauri', ...tauriArguments], {
  cwd: desktopPackageDirectory,
  env: {
    ...process.env,
    CARGO_TARGET_DIR: cargoTargetDirectory,
  },
});

if (tauriArguments[0] === 'build') {
  assertInstallerArtifact(cargoTargetDirectory);
}
