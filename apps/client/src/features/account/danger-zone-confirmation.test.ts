import { describe, expect, it } from 'vitest';

import { matchesDangerZoneConfirmation } from './danger-zone-confirmation';

describe('matchesDangerZoneConfirmation', () => {
  it('accepts the phrase shown in the dialog, ignoring surrounding spaces', () => {
    expect(matchesDangerZoneConfirmation('  akceptuję  ', 'akceptuję')).toBe(true);
    expect(matchesDangerZoneConfirmation('  I accept  ', 'I accept')).toBe(true);
  });

  it('rejects a different phrase, different letter case, and an empty requirement', () => {
    expect(matchesDangerZoneConfirmation('akceptuje', 'akceptuję')).toBe(false);
    expect(matchesDangerZoneConfirmation('i accept', 'I accept')).toBe(false);
    expect(matchesDangerZoneConfirmation('', '')).toBe(false);
    expect(matchesDangerZoneConfirmation('I accept', '   ')).toBe(false);
  });
});
