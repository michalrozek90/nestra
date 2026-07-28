import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readJson(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  return {
    absolutePath,
    value: JSON.parse(readFileSync(absolutePath, 'utf8')),
  };
}

function readText(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  return {
    absolutePath,
    value: readFileSync(absolutePath, 'utf8'),
  };
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const rootPackage = readJson('package.json');
const productVersion = rootPackage.value.version;

if (typeof productVersion !== 'string' || !SEMVER_PATTERN.test(productVersion)) {
  fail(
    `Root package.json version must be a SemVer string. Found: ${JSON.stringify(productVersion)}`,
  );
}

const releasePleaseManifest = readJson('.release-please-manifest.json');
const manifestVersion = releasePleaseManifest.value['.'];

if (manifestVersion !== productVersion) {
  fail(
    [
      'Release Please manifest version must match the root product version.',
      `  root package.json: ${productVersion}`,
      `  .release-please-manifest.json ["."]: ${JSON.stringify(manifestVersion)}`,
    ].join('\n'),
  );
}

const tauriConfig = readJson('apps/desktop/src-tauri/tauri.conf.json');
const tauriVersionReference = tauriConfig.value.version;

if (tauriVersionReference !== '../../../package.json') {
  fail(
    [
      'Tauri must read the product version from the root package.json.',
      `  expected: "../../../package.json"`,
      `  found: ${JSON.stringify(tauriVersionReference)}`,
    ].join('\n'),
  );
}

const cargoToml = readText('apps/desktop/src-tauri/Cargo.toml');
const cargoPackageVersionMatch = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml.value);

if (cargoPackageVersionMatch === null) {
  fail('apps/desktop/src-tauri/Cargo.toml must declare package.version.');
} else if (cargoPackageVersionMatch[1] !== productVersion) {
  fail(
    [
      'Desktop Cargo package.version must match the root product version.',
      `  root package.json: ${productVersion}`,
      `  Cargo.toml package.version: ${cargoPackageVersionMatch[1]}`,
    ].join('\n'),
  );
}

const appConfig = readText('apps/client/app.config.ts');
const appConfigChecks = [
  {
    label: 'imports root package.json',
    pattern: /from ['"]\.\.\/\.\.\/package\.json['"]/,
  },
  {
    label: 'sets Expo version from rootPackage.version',
    pattern: /version:\s*rootPackage\.version/,
  },
  {
    label: 'sets runtimeVersion from rootPackage.version',
    pattern: /runtimeVersion:\s*rootPackage\.version/,
  },
  {
    label: 'sets extra.applicationVersion from rootPackage.version',
    pattern: /applicationVersion:\s*rootPackage\.version/,
  },
];

for (const check of appConfigChecks) {
  if (!check.pattern.test(appConfig.value)) {
    fail(`apps/client/app.config.ts must ${check.label}.`);
  }
}

const contractsBuildConfig = readText('packages/contracts/tsdown.config.ts');

if (!contractsBuildConfig.value.includes('../../package.json')) {
  fail('packages/contracts/tsdown.config.ts must read the root package.json product version.');
}

if (!contractsBuildConfig.value.includes('__NESTRA_APPLICATION_VERSION__')) {
  fail('packages/contracts/tsdown.config.ts must inject __NESTRA_APPLICATION_VERSION__.');
}

if (process.exitCode === 1) {
  process.exit(1);
}

console.log(
  [
    'Product version synchronization checks passed.',
    `  product version: ${productVersion}`,
    '  sources: root package.json, Release Please manifest, Tauri config, Cargo.toml, Expo app config, contracts build injection',
  ].join('\n'),
);
