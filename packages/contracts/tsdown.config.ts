import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsdown';

const rootPackageJsonUrl = new URL('../../package.json', import.meta.url);
const rootPackageJson: unknown = JSON.parse(readFileSync(rootPackageJsonUrl, 'utf8'));

if (
  typeof rootPackageJson !== 'object' ||
  rootPackageJson === null ||
  !('version' in rootPackageJson) ||
  typeof rootPackageJson.version !== 'string'
) {
  throw new Error('The root package.json must contain a string version.');
}

export default defineConfig({
  clean: true,
  define: {
    __NESTRA_APPLICATION_VERSION__: JSON.stringify(rootPackageJson.version),
  },
  deps: {
    neverBundle: ['zod'],
  },
  dts: {
    sourcemap: true,
  },
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  sourcemap: true,
  target: 'es2023',
});
