import { describe, expect, it } from 'vitest';

import { readSingleDesktopCallbackUrl } from './external-auth-callback-list';

describe('readSingleDesktopCallbackUrl', () => {
  it('returns the only callback URL', () => {
    expect(
      readSingleDesktopCallbackUrl([
        'com.michalrozek.nestra.desktop:/oauth/google?handoff=transaction.secret',
      ]),
    ).toBe('com.michalrozek.nestra.desktop:/oauth/google?handoff=transaction.secret');
  });

  it.each([null, [], ['first', 'second']] as const)(
    'rejects an absent or ambiguous callback list',
    (callbackUrls) => {
      expect(readSingleDesktopCallbackUrl(callbackUrls)).toBeNull();
    },
  );
});
