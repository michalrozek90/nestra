import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readArgument(name) {
  const argumentIndex = process.argv.indexOf(name);
  const argumentValue = argumentIndex === -1 ? undefined : process.argv[argumentIndex + 1];
  if (!argumentValue) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return argumentValue;
}

function requireObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

const manifestPath = path.resolve(readArgument('--manifest'));
const releaseTag = readArgument('--tag');
const installerAssetUrl = readArgument('--installer-asset-url');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..', '..');
const packageMetadata = requireObject(
  JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')),
  'Root package metadata',
);
const productVersion = packageMetadata.version;

if (typeof productVersion !== 'string' || releaseTag !== `v${productVersion}`) {
  throw new Error('Updater release tag does not match the root product version.');
}

const manifest = requireObject(
  JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
  'Updater manifest',
);
if (manifest.version !== productVersion) {
  throw new Error('Updater manifest version does not match the root product version.');
}

const platforms = requireObject(manifest.platforms, 'Updater manifest platforms');
const windowsX64 = requireObject(platforms['windows-x86_64'], 'Windows x64 updater platform');
const windowsX64Nsis = requireObject(
  platforms['windows-x86_64-nsis'],
  'Windows x64 NSIS updater platform',
);

if (windowsX64.url !== installerAssetUrl || windowsX64Nsis.url !== installerAssetUrl) {
  throw new Error('Windows x64 updater URL does not match the release installer asset.');
}
if (typeof windowsX64.signature !== 'string' || windowsX64.signature.trim().length === 0) {
  throw new Error('Windows x64 updater signature is missing.');
}
if (windowsX64Nsis.signature !== windowsX64.signature) {
  throw new Error('Windows x64 NSIS updater signature does not match the primary entry.');
}

console.log(`Validated updater manifest for ${releaseTag} (windows-x86_64).`);
