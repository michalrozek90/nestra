import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { classifyAccountDeletionFailure } from './classify-account-deletion-failure';

describe('classifyAccountDeletionFailure', () => {
  it('treats a request that never reached the server as offline', () => {
    expect(classifyAccountDeletionFailure(new AxiosError('Network Error'))).toBe('offline');
  });

  it('treats a server response as a failed deletion', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      config: { headers: {} as never },
      data: {},
      headers: {},
      status: 500,
      statusText: 'Server Error',
    };

    expect(classifyAccountDeletionFailure(error)).toBe('rejected');
  });
});
