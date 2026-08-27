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

const releasePleaseConfig = readJson('release-please-config.json');
const releasePleaseRootPackageConfig = releasePleaseConfig.value.packages?.['.'];
const releasePleaseExtraFiles = Array.isArray(releasePleaseRootPackageConfig?.['extra-files'])
  ? releasePleaseRootPackageConfig['extra-files']
  : [];
const cargoLockUpdaterConfigs = releasePleaseExtraFiles.filter(
  (extraFile) =>
    typeof extraFile === 'object' &&
    extraFile !== null &&
    extraFile.path === 'apps/desktop/src-tauri/Cargo.lock',
);

if (cargoLockUpdaterConfigs.length !== 1 || cargoLockUpdaterConfigs[0].type !== 'generic') {
  fail(
    'Release Please must use exactly one generic updater for apps/desktop/src-tauri/Cargo.lock.',
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
const cargoPackageSectionMatch = /\[package\]([\s\S]*?)(?=\n\[|$)/.exec(cargoToml.value);
const cargoPackageVersionMatch =
  cargoPackageSectionMatch === null
    ? null
    : /^version\s*=\s*"([^"]+)"/m.exec(cargoPackageSectionMatch[1]);

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

const cargoLock = readText('apps/desktop/src-tauri/Cargo.lock');
const cargoLockPackageSections =
  cargoLock.value.match(/\[\[package\]\][\s\S]*?(?=\r?\n\[\[package\]\]|$)/g) ?? [];
const desktopCargoLockPackageSections = cargoLockPackageSections.filter((packageSection) =>
  /^name\s*=\s*"nestra-desktop"$/m.test(packageSection),
);

if (desktopCargoLockPackageSections.length !== 1) {
  fail(
    `apps/desktop/src-tauri/Cargo.lock must contain exactly one nestra-desktop package entry. Found: ${desktopCargoLockPackageSections.length}`,
  );
} else {
  const cargoLockVersionMatch = /^version\s*=\s*"([^"]+)"\s+#\s+x-release-please-version\s*$/m.exec(
    desktopCargoLockPackageSections[0],
  );

  if (cargoLockVersionMatch === null) {
    fail(
      'The nestra-desktop Cargo.lock package entry must declare its version with the x-release-please-version annotation.',
    );
  } else if (cargoLockVersionMatch[1] !== productVersion) {
    fail(
      [
        'Desktop Cargo.lock package version must match the root product version.',
        `  root package.json: ${productVersion}`,
        `  Cargo.lock nestra-desktop version: ${cargoLockVersionMatch[1]}`,
      ].join('\n'),
    );
  }
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
    '  sources: root package.json, Release Please manifest, Tauri config, Cargo.toml, Cargo.lock, Expo app config, contracts build injection',
  ].join('\n'),
);
