import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getChangeIds, promoteReleaseNotes } from './release-notes-lib.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const releaseNotesDataPath = path.join(
  repositoryRoot,
  'apps',
  'client',
  'src',
  'features',
  'releases',
  'release-notes-data.json',
);

const candidateVersion = readArgument('--version');
const baseVersion = readArgument('--base-version');
const releaseDate = readArgument('--date');
const releaseNotesData = JSON.parse(readFileSync(releaseNotesDataPath, 'utf8'));
const promotedReleaseNotesData = promoteReleaseNotes({
  baseVersion,
  candidateVersion,
  releaseDate,
  releaseNotesData,
});

writeFileSync(releaseNotesDataPath, `${JSON.stringify(promotedReleaseNotesData, null, 2)}\n`);

const promotedReleaseNote = promotedReleaseNotesData.released.find(
  (releaseNote) => releaseNote.version === candidateVersion,
);
const promotedChangeCount =
  promotedReleaseNote === undefined ? 0 : getChangeIds(promotedReleaseNote.changes).length;

process.stdout.write(
  promotedChangeCount === 0
    ? `No curated notes were pending for ${candidateVersion}; no in-app release entry was created.\n`
    : `Promoted ${promotedChangeCount} curated notes to ${candidateVersion} (${promotedReleaseNote.releaseDate}).\n`,
);

function readArgument(name) {
  const argumentPrefix = `${name}=`;
  const argument = process.argv
    .slice(2)
    .find((currentArgument) => currentArgument.startsWith(argumentPrefix));

  if (argument === undefined) {
    throw new Error(`Missing required ${name}=... argument.`);
  }

  return argument.slice(argumentPrefix.length);
}
