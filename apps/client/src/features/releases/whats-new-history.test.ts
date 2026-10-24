import { describe, expect, it } from 'vitest';

import { formatReleaseDate } from './format-release-date';
import { getReleaseNotesNewestFirst } from './release-notes';
import { splitReleaseHistory } from './split-release-history';
import { isWhatsNewHistoryPath, shouldPersistSeenReleaseNotes } from './whats-new-dialog-action';

describe('splitReleaseHistory', () => {
  it('keeps the newest release separate from earlier releases', () => {
    const history = splitReleaseHistory(['0.3.0', '0.2.0', '0.1.0']);

    expect(history.latest).toBe('0.3.0');
    expect(history.earlier).toEqual(['0.2.0', '0.1.0']);
  });

  it('omits the earlier group when only one release exists', () => {
    const history = splitReleaseHistory(['0.3.0']);

    expect(history.latest).toBe('0.3.0');
    expect(history.earlier).toEqual([]);
  });
});

describe('formatReleaseDate', () => {
  it('formats a valid publication date in the requested language', () => {
    expect(formatReleaseDate('2026-08-27', 'en')).toContain('2026');
    expect(formatReleaseDate('2026-08-27', 'pl')).toContain('2026');
    expect(formatReleaseDate('2026-08-27', 'en')).not.toBe(formatReleaseDate('2026-08-27', 'pl'));
  });

  it('returns no date for a missing or invalid value', () => {
    expect(formatReleaseDate(undefined, 'en')).toBe('');
    expect(formatReleaseDate('2026-02-31', 'en')).toBe('');
  });
});

describe('installed release filtering', () => {
  it('hides curated releases newer than the installed version', () => {
    expect(getReleaseNotesNewestFirst('0.2.0').map((releaseNote) => releaseNote.version)).toEqual([
      '0.2.0',
      '0.1.0',
    ]);
  });
});

describe('whats new dialog actions', () => {
  it('persists the seen version only when the dialog is acknowledged', () => {
    expect(shouldPersistSeenReleaseNotes('acknowledge')).toBe(true);
    expect(shouldPersistSeenReleaseNotes('view-history')).toBe(false);
  });

  it('recognizes the dedicated history route', () => {
    expect(isWhatsNewHistoryPath('/settings/whats-new')).toBe(true);
    expect(isWhatsNewHistoryPath('/settings/about')).toBe(false);
  });
});
