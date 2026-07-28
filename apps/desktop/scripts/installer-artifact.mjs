import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(desktopPackageDirectory, '../..');

export function readProductVersion() {
  const rootPackageJsonPath = path.join(repositoryRoot, 'package.json');
  const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf8'));

  if (typeof rootPackageJson.version !== 'string' || rootPackageJson.version.length === 0) {
    throw new Error('The root package.json must contain a non-empty string version.');
  }

  return rootPackageJson.version;
}

export function getExpectedInstallerFileName(productVersion = readProductVersion()) {
  return `Nestra_${productVersion}_x64-setup.exe`;
}

export function resolveInstallerArtifactPath(cargoTargetDirectory) {
  const expectedFileName = getExpectedInstallerFileName();
  const candidateDirectories = [
    path.join(cargoTargetDirectory, 'release', 'bundle', 'nsis'),
    path.join(cargoTargetDirectory, 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis'),
  ];

  for (const candidateDirectory of candidateDirectories) {
    const candidatePath = path.join(candidateDirectory, expectedFileName);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

export function assertInstallerArtifact(cargoTargetDirectory) {
  const expectedFileName = getExpectedInstallerFileName();
  const installerPath = resolveInstallerArtifactPath(cargoTargetDirectory);

  if (installerPath === null) {
    const searchedDirectories = [
      path.join(cargoTargetDirectory, 'release', 'bundle', 'nsis'),
      path.join(cargoTargetDirectory, 'x86_64-pc-windows-msvc', 'release', 'bundle', 'nsis'),
    ];

    console.error(
      [
        `Expected Windows x64 installer artifact was not found: ${expectedFileName}`,
        'Searched:',
        ...searchedDirectories.map((directory) => `  - ${directory}`),
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(`Windows x64 installer artifact ready: ${installerPath}`);
  return installerPath;
}

const entryArgument = process.argv[1];
const isExecutedDirectly =
  typeof entryArgument === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(entryArgument)).href;

if (isExecutedDirectly) {
  const cargoTargetDirectory = process.env.CARGO_TARGET_DIR;

  if (typeof cargoTargetDirectory !== 'string' || cargoTargetDirectory.length === 0) {
    console.error('CARGO_TARGET_DIR must be set when resolving the installer artifact.');
    process.exit(1);
  }

  const installerPath = assertInstallerArtifact(cargoTargetDirectory);
  const expectedFileName = getExpectedInstallerFileName();
  const githubOutputPath = process.env.GITHUB_OUTPUT;

  if (typeof githubOutputPath === 'string' && githubOutputPath.length > 0) {
    appendFileSync(githubOutputPath, `path=${installerPath}\nname=${expectedFileName}\n`, 'utf8');
  }
}
