const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CHANGE_ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;

export function compareVersions(leftVersion, rightVersion) {
  const leftParts = parseVersion(leftVersion);
  const rightParts = parseVersion(rightVersion);

  for (let index = 0; index < leftParts.length; index += 1) {
    const difference = leftParts[index] - rightParts[index];

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

export function promoteReleaseNotes({
  baseVersion,
  candidateVersion,
  releaseDate,
  releaseNotesData,
}) {
  requireVersion(baseVersion, 'base version');
  requireVersion(candidateVersion, 'candidate version');
  requireReleaseDate(releaseDate);
  validateReleaseNotesData(releaseNotesData);

  if (compareVersions(candidateVersion, baseVersion) <= 0) {
    throw new Error(
      `Candidate version ${candidateVersion} must be greater than base version ${baseVersion}.`,
    );
  }

  const historicalReleaseNotes = releaseNotesData.released.filter(
    (releaseNote) => compareVersions(releaseNote.version, baseVersion) <= 0,
  );
  const pendingReleaseNotes = releaseNotesData.released.filter(
    (releaseNote) => compareVersions(releaseNote.version, baseVersion) > 0,
  );

  if (pendingReleaseNotes.length > 1) {
    throw new Error('At most one promoted release candidate may exist above the base version.');
  }

  const pendingReleaseNote = pendingReleaseNotes[0];
  const promotedChanges = mergeChangeGroups(
    pendingReleaseNote?.changes ?? emptyChangeGroups(),
    releaseNotesData.unreleased,
  );
  const hasPromotedChanges = getChangeIds(promotedChanges).length > 0;
  const effectiveReleaseDate =
    pendingReleaseNote?.version === candidateVersion ? pendingReleaseNote.releaseDate : releaseDate;

  return {
    unreleased: emptyChangeGroups(),
    released: hasPromotedChanges
      ? [
          {
            version: candidateVersion,
            releaseDate: effectiveReleaseDate,
            changes: promotedChanges,
          },
          ...historicalReleaseNotes,
        ]
      : historicalReleaseNotes,
  };
}

export function validateReleaseNotes({
  baseline,
  candidateVersion,
  englishTranslations,
  polishTranslations,
  productVersion,
  releaseNotesData,
}) {
  requireVersion(productVersion, 'product version');
  validateReleaseNotesData(releaseNotesData);
  validateTranslations(englishTranslations, polishTranslations, releaseNotesData);

  let previousVersion = null;

  for (const releaseNote of releaseNotesData.released) {
    if (compareVersions(releaseNote.version, productVersion) > 0) {
      throw new Error(
        `Released note ${releaseNote.version} cannot be newer than product version ${productVersion}.`,
      );
    }

    if (previousVersion !== null && compareVersions(previousVersion, releaseNote.version) <= 0) {
      throw new Error('Released notes must use unique versions in newest-first order.');
    }

    previousVersion = releaseNote.version;
  }

  if (candidateVersion !== undefined) {
    requireVersion(candidateVersion, 'candidate version');

    if (candidateVersion !== productVersion) {
      throw new Error(
        `Candidate version ${candidateVersion} must match product version ${productVersion}.`,
      );
    }

    if (getChangeIds(releaseNotesData.unreleased).length > 0) {
      throw new Error('A release candidate cannot contain unpromoted curated release notes.');
    }

    if (baseline !== undefined) {
      validateCandidatePromotion(candidateVersion, baseline.releaseNotesData, releaseNotesData);
    }
  }

  if (baseline !== undefined) {
    validatePreservedHistory({
      baseline,
      englishTranslations,
      polishTranslations,
      releaseNotesData,
    });
  }
}

function validateCandidatePromotion(candidateVersion, baselineReleaseNotesData, releaseNotesData) {
  const baselineReleasedVersions = new Set(
    baselineReleaseNotesData.released.map((releaseNote) => releaseNote.version),
  );
  const addedReleaseNotes = releaseNotesData.released.filter(
    (releaseNote) => !baselineReleasedVersions.has(releaseNote.version),
  );
  const unexpectedReleaseNote = addedReleaseNotes.find(
    (releaseNote) => releaseNote.version !== candidateVersion,
  );

  if (unexpectedReleaseNote !== undefined) {
    throw new Error(
      `Candidate promotion created unexpected version ${unexpectedReleaseNote.version}.`,
    );
  }

  const baselineUnreleasedChangeIds = getChangeIds(baselineReleaseNotesData.unreleased);
  const candidateReleaseNote = addedReleaseNotes.find(
    (releaseNote) => releaseNote.version === candidateVersion,
  );

  if (baselineUnreleasedChangeIds.length === 0) {
    if (candidateReleaseNote !== undefined) {
      throw new Error('An empty Unreleased collection cannot create an in-app candidate entry.');
    }

    return;
  }

  if (candidateReleaseNote === undefined) {
    throw new Error(`Pending curated notes must be promoted to candidate ${candidateVersion}.`);
  }

  const candidateChangeIds = new Set(getChangeIds(candidateReleaseNote.changes));
  const missingPromotedChangeId = baselineUnreleasedChangeIds.find(
    (changeId) => !candidateChangeIds.has(changeId),
  );

  if (missingPromotedChangeId !== undefined) {
    throw new Error(
      `Pending curated note ${missingPromotedChangeId} was not promoted to ${candidateVersion}.`,
    );
  }
}

export function getChangeIds(changeGroups) {
  return [...changeGroups.new, ...changeGroups.fixes];
}

function emptyChangeGroups() {
  return {
    new: [],
    fixes: [],
  };
}

function mergeChangeGroups(leftGroups, rightGroups) {
  const mergedGroups = {
    new: unique([...leftGroups.new, ...rightGroups.new]),
    fixes: unique([...leftGroups.fixes, ...rightGroups.fixes]),
  };
  const newChangeIds = new Set(mergedGroups.new);
  const conflictingChangeId = mergedGroups.fixes.find((changeId) => newChangeIds.has(changeId));

  if (conflictingChangeId !== undefined) {
    throw new Error(
      `Release-note change ${conflictingChangeId} cannot be both a new item and a fix.`,
    );
  }

  return mergedGroups;
}

function unique(values) {
  return [...new Set(values)];
}

function validateReleaseNotesData(releaseNotesData) {
  requireRecord(releaseNotesData, 'release-notes data');
  validateChangeGroups(releaseNotesData.unreleased, 'unreleased');

  if (!Array.isArray(releaseNotesData.released)) {
    throw new Error('Released notes must be an array.');
  }

  const allChangeIds = new Set();

  registerUniqueChangeIds(releaseNotesData.unreleased, allChangeIds);

  for (const [index, releaseNote] of releaseNotesData.released.entries()) {
    const scope = `released[${index}]`;
    requireRecord(releaseNote, scope);
    requireVersion(releaseNote.version, `${scope}.version`);
    requireReleaseDate(releaseNote.releaseDate, `${scope}.releaseDate`);
    validateChangeGroups(releaseNote.changes, `${scope}.changes`);

    if (getChangeIds(releaseNote.changes).length === 0) {
      throw new Error(`${scope} cannot be empty.`);
    }

    registerUniqueChangeIds(releaseNote.changes, allChangeIds);
  }
}

function validateChangeGroups(changeGroups, scope) {
  requireRecord(changeGroups, scope);
  requireChangeIds(changeGroups.new, `${scope}.new`);
  requireChangeIds(changeGroups.fixes, `${scope}.fixes`);
}

function requireChangeIds(changeIds, scope) {
  if (!Array.isArray(changeIds)) {
    throw new Error(`${scope} must be an array.`);
  }

  for (const changeId of changeIds) {
    if (typeof changeId !== 'string' || !CHANGE_ID_PATTERN.test(changeId)) {
      throw new Error(`${scope} contains an invalid change identifier.`);
    }
  }
}

function registerUniqueChangeIds(changeGroups, allChangeIds) {
  for (const changeId of getChangeIds(changeGroups)) {
    if (allChangeIds.has(changeId)) {
      throw new Error(`Release-note change identifier ${changeId} is used more than once.`);
    }

    allChangeIds.add(changeId);
  }
}

function validateTranslations(englishTranslations, polishTranslations, releaseNotesData) {
  requireRecord(englishTranslations, 'English release-note translations');
  requireRecord(polishTranslations, 'Polish release-note translations');

  const referencedChangeIds = new Set([
    ...getChangeIds(releaseNotesData.unreleased),
    ...releaseNotesData.released.flatMap((releaseNote) => getChangeIds(releaseNote.changes)),
  ]);
  const englishChangeIds = Object.keys(englishTranslations);
  const polishChangeIds = Object.keys(polishTranslations);

  requireExactChangeIds(englishChangeIds, referencedChangeIds, 'English');
  requireExactChangeIds(polishChangeIds, referencedChangeIds, 'Polish');

  for (const changeId of referencedChangeIds) {
    requireConciseTranslation(englishTranslations[changeId], `English ${changeId}`);
    requireConciseTranslation(polishTranslations[changeId], `Polish ${changeId}`);
  }
}

function requireExactChangeIds(actualChangeIds, expectedChangeIds, language) {
  const actualChangeIdSet = new Set(actualChangeIds);
  const missingChangeIds = [...expectedChangeIds].filter(
    (changeId) => !actualChangeIdSet.has(changeId),
  );
  const unusedChangeIds = actualChangeIds.filter((changeId) => !expectedChangeIds.has(changeId));

  if (missingChangeIds.length > 0 || unusedChangeIds.length > 0) {
    throw new Error(
      `${language} release-note translations do not match referenced change identifiers. Missing: ${missingChangeIds.join(', ') || 'none'}. Unused: ${unusedChangeIds.join(', ') || 'none'}.`,
    );
  }
}

function requireConciseTranslation(translation, scope) {
  if (
    typeof translation !== 'string' ||
    translation.trim() !== translation ||
    translation.length === 0 ||
    translation.length > 300 ||
    translation.includes('\n')
  ) {
    throw new Error(
      `${scope} must be one non-empty, single-line description up to 300 characters.`,
    );
  }
}

function validatePreservedHistory({
  baseline,
  englishTranslations,
  polishTranslations,
  releaseNotesData,
}) {
  validateReleaseNotesData(baseline.releaseNotesData);
  const currentReleaseNotesByVersion = new Map(
    releaseNotesData.released.map((releaseNote) => [releaseNote.version, releaseNote]),
  );

  for (const baselineReleaseNote of baseline.releaseNotesData.released) {
    const currentReleaseNote = currentReleaseNotesByVersion.get(baselineReleaseNote.version);

    if (JSON.stringify(currentReleaseNote) !== JSON.stringify(baselineReleaseNote)) {
      throw new Error(
        `Released history for ${baselineReleaseNote.version} cannot be removed or changed.`,
      );
    }

    for (const changeId of getChangeIds(baselineReleaseNote.changes)) {
      if (englishTranslations[changeId] !== baseline.englishTranslations[changeId]) {
        throw new Error(`Released English copy ${changeId} cannot be changed silently.`);
      }

      if (polishTranslations[changeId] !== baseline.polishTranslations[changeId]) {
        throw new Error(`Released Polish copy ${changeId} cannot be changed silently.`);
      }
    }
  }

  const currentChangeIds = new Set([
    ...getChangeIds(releaseNotesData.unreleased),
    ...releaseNotesData.released.flatMap((releaseNote) => getChangeIds(releaseNote.changes)),
  ]);

  for (const changeId of getChangeIds(baseline.releaseNotesData.unreleased)) {
    if (!currentChangeIds.has(changeId)) {
      throw new Error(`Unreleased change ${changeId} cannot disappear during promotion.`);
    }
  }
}

function requireVersion(version, scope) {
  if (typeof version !== 'string' || !SEMVER_PATTERN.test(version)) {
    throw new Error(`${scope} must be a stable SemVer version.`);
  }
}

function parseVersion(version) {
  requireVersion(version, 'version');
  return version.split('.').map((part) => Number.parseInt(part, 10));
}

function requireReleaseDate(releaseDate, scope = 'release date') {
  if (typeof releaseDate !== 'string' || !RELEASE_DATE_PATTERN.test(releaseDate)) {
    throw new Error(`${scope} must use YYYY-MM-DD.`);
  }

  const parsedDate = new Date(`${releaseDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== releaseDate) {
    throw new Error(`${scope} must be a real calendar date.`);
  }
}

function requireRecord(value, scope) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${scope} must be an object.`);
  }
}
