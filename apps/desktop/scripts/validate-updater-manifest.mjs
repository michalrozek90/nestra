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
const repository = readArgument('--repository');
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
const installerName = `Nestra_${productVersion}_x64-setup.exe`;
const expectedUrl = `https://github.com/${repository}/releases/download/${releaseTag}/${installerName}`;

if (windowsX64.url !== expectedUrl) {
  throw new Error('Windows x64 updater URL does not match the release installer asset.');
}
if (typeof windowsX64.signature !== 'string' || windowsX64.signature.trim().length === 0) {
  throw new Error('Windows x64 updater signature is missing.');
}

console.log(`Validated updater manifest for ${releaseTag} (windows-x86_64).`);
