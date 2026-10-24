import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { promoteReleaseNotes, validateReleaseNotes } from './release-notes-lib.mjs';

const translations = {
  firstChange: 'A concise release note.',
  secondChange: 'Another concise release note.',
};

describe('promoteReleaseNotes', () => {
  it('promotes Unreleased notes and preserves released history', () => {
    const promoted = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.4.0',
      releaseDate: '2026-10-24',
      releaseNotesData: createReleaseNotesData(),
    });

    assert.deepEqual(promoted.unreleased, { new: [], fixes: [] });
    assert.equal(promoted.released[0].version, '0.4.0');
    assert.deepEqual(promoted.released[0].changes.new, ['secondChange']);
    assert.equal(promoted.released[1].version, '0.3.0');
  });

  it('is idempotent when the same candidate is promoted again', () => {
    const firstPromotion = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.4.0',
      releaseDate: '2026-10-24',
      releaseNotesData: createReleaseNotesData(),
    });
    const repeatedPromotion = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.4.0',
      releaseDate: '2026-10-25',
      releaseNotesData: firstPromotion,
    });

    assert.deepEqual(repeatedPromotion, firstPromotion);
  });

  it('replaces a pending candidate when the calculated version changes', () => {
    const firstPromotion = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.3.1',
      releaseDate: '2026-10-24',
      releaseNotesData: createReleaseNotesData(),
    });
    const updatedPromotion = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.4.0',
      releaseDate: '2026-10-25',
      releaseNotesData: firstPromotion,
    });

    assert.deepEqual(
      updatedPromotion.released.map((releaseNote) => releaseNote.version),
      ['0.4.0', '0.3.0'],
    );
    assert.equal(updatedPromotion.released[0].releaseDate, '2026-10-25');
  });

  it('does not create an empty released entry', () => {
    const releaseNotesData = createReleaseNotesData();
    releaseNotesData.unreleased.new = [];
    const promoted = promoteReleaseNotes({
      baseVersion: '0.3.0',
      candidateVersion: '0.3.1',
      releaseDate: '2026-10-24',
      releaseNotesData,
    });

    assert.deepEqual(
      promoted.released.map((releaseNote) => releaseNote.version),
      ['0.3.0'],
    );
  });
});

describe('validateReleaseNotes', () => {
  it('accepts paired translations and newest-first released history', () => {
    assert.doesNotThrow(() =>
      validateReleaseNotes({
        englishTranslations: translations,
        polishTranslations: translations,
        productVersion: '0.3.0',
        releaseNotesData: createReleaseNotesData(),
      }),
    );
  });

  it('rejects a release candidate with unpromoted copy', () => {
    assert.throws(
      () =>
        validateReleaseNotes({
          candidateVersion: '0.3.0',
          englishTranslations: translations,
          polishTranslations: translations,
          productVersion: '0.3.0',
          releaseNotesData: createReleaseNotesData(),
        }),
      /cannot contain unpromoted/,
    );
  });

  it('requires baseline Unreleased copy to target the exact candidate version', () => {
    const baseline = createReleaseNotesData();
    const incorrectlyPromoted = {
      unreleased: { new: [], fixes: [] },
      released: [
        {
          version: '0.3.1',
          releaseDate: '2026-10-24',
          changes: { new: ['secondChange'], fixes: [] },
        },
        ...baseline.released,
      ],
    };

    assert.throws(
      () =>
        validateReleaseNotes({
          baseline: {
            releaseNotesData: baseline,
            englishTranslations: translations,
            polishTranslations: translations,
          },
          candidateVersion: '0.4.0',
          englishTranslations: translations,
          polishTranslations: translations,
          productVersion: '0.4.0',
          releaseNotesData: incorrectlyPromoted,
        }),
      /unexpected version/,
    );
  });

  it('rejects silently changed released history', () => {
    const baseline = createReleaseNotesData();
    const current = createReleaseNotesData();
    current.released[0].releaseDate = '2026-10-02';

    assert.throws(
      () =>
        validateReleaseNotes({
          baseline: {
            releaseNotesData: baseline,
            englishTranslations: translations,
            polishTranslations: translations,
          },
          englishTranslations: translations,
          polishTranslations: translations,
          productVersion: '0.3.0',
          releaseNotesData: current,
        }),
      /cannot be removed or changed/,
    );
  });
});

function createReleaseNotesData() {
  return {
    unreleased: {
      new: ['secondChange'],
      fixes: [],
    },
    released: [
      {
        version: '0.3.0',
        releaseDate: '2026-10-01',
        changes: {
          new: ['firstChange'],
          fixes: [],
        },
      },
    ],
  };
}
