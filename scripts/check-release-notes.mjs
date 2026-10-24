import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateReleaseNotes } from './release-notes-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const paths = {
  data: 'apps/client/src/features/releases/release-notes-data.json',
  english: 'apps/client/src/i18n/en/release-note-changes.json',
  polish: 'apps/client/src/i18n/pl/release-note-changes.json',
};
const rootPackage = readJsonFile('package.json');
const releaseNotesData = readJsonFile(paths.data);
const englishTranslations = readJsonFile(paths.english);
const polishTranslations = readJsonFile(paths.polish);
const candidateVersion = readOptionalArgument('--candidate-version');
const requestedBaselineRef = readOptionalArgument('--baseline-ref');
const baselineRef = requestedBaselineRef ?? resolveAutomaticBaselineRef();
const baseline = baselineRef === undefined ? undefined : readBaseline(baselineRef);

try {
  validateReleaseNotes({
    baseline,
    candidateVersion,
    englishTranslations,
    polishTranslations,
    productVersion: rootPackage.version,
    releaseNotesData,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown release-note validation error.';
  process.stderr.write(`Release-note validation failed: ${message}\n`);
  process.exit(1);
}

process.stdout.write(
  `Curated release-note checks passed${baseline === undefined ? '' : ` against ${baselineRef}`}.\n`,
);

function readJsonFile(relativePath) {
  return JSON.parse(readFileSync(path.join(repositoryRoot, relativePath), 'utf8'));
}

function readOptionalArgument(name) {
  const argumentPrefix = `${name}=`;
  const argument = process.argv
    .slice(2)
    .find((currentArgument) => currentArgument.startsWith(argumentPrefix));
  return argument?.slice(argumentPrefix.length);
}

function resolveAutomaticBaselineRef() {
  if (process.env.GITHUB_BASE_REF) {
    return canReadGitFile('HEAD^1', paths.data) ? 'HEAD^1' : undefined;
  }

  const branchName = runGit(['branch', '--show-current']);

  if (branchName && branchName !== 'main') {
    return canReadGitFile('origin/main', paths.data) ? 'origin/main' : undefined;
  }

  return undefined;
}

function readBaseline(ref) {
  if (!canReadGitFile(ref, paths.data)) {
    if (requestedBaselineRef !== undefined) {
      throw new Error(`Baseline ${ref} does not contain ${paths.data}.`);
    }

    return undefined;
  }

  return {
    releaseNotesData: readJsonFromGit(ref, paths.data),
    englishTranslations: readJsonFromGit(ref, paths.english),
    polishTranslations: readJsonFromGit(ref, paths.polish),
  };
}

function canReadGitFile(ref, relativePath) {
  const command = spawnSync('git', ['cat-file', '-e', `${ref}:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return command.status === 0;
}

function readJsonFromGit(ref, relativePath) {
  const contents = runGit(['show', `${ref}:${relativePath}`]);

  if (contents === undefined) {
    throw new Error(`Could not read ${relativePath} from baseline ${ref}.`);
  }

  return JSON.parse(contents);
}

function runGit(argumentsList) {
  const command = spawnSync('git', argumentsList, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  return command.status === 0 ? command.stdout.trim() : undefined;
}
