import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const desktopPackageDirectory = path.resolve(scriptDirectory, '..');
const repositoryRoot = path.resolve(desktopPackageDirectory, '../..');

// Local packaging convenience path. Cargo intermediates stay under CARGO_TARGET_DIR;
// only the finished NSIS installer is copied here after a successful build.
export const DEFAULT_LOCAL_INSTALLER_OUTPUT_DIRECTORY = 'D:\\Nestra-setup';

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

export function resolveInstallerOutputDirectory() {
  const configuredOutputDirectory = process.env.NESTRA_INSTALLER_OUTPUT_DIR;

  if (typeof configuredOutputDirectory === 'string' && configuredOutputDirectory.length > 0) {
    return configuredOutputDirectory;
  }

  // CI uploads from CARGO_TARGET_DIR; skip the local convenience copy unless overridden.
  if (process.env.CI === 'true') {
    return null;
  }

  return DEFAULT_LOCAL_INSTALLER_OUTPUT_DIRECTORY;
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

export function copyInstallerArtifact(installerPath, outputDirectory) {
  const expectedFileName = getExpectedInstallerFileName();
  const destinationPath = path.join(outputDirectory, expectedFileName);

  mkdirSync(outputDirectory, { recursive: true });
  copyFileSync(installerPath, destinationPath);

  console.log(`Windows x64 installer copied to: ${destinationPath}`);
  return destinationPath;
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

  const installerOutputDirectory = resolveInstallerOutputDirectory();

  if (installerOutputDirectory !== null) {
    return copyInstallerArtifact(installerPath, installerOutputDirectory);
  }

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
