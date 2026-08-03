import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { QueryFailedError } from 'typeorm';

import {
  EXTERNAL_AUTH_IDENTITY_PROVIDER_SUBJECT_UNIQUE,
  EXTERNAL_AUTH_IDENTITY_USER_PROVIDER_UNIQUE,
  mapExternalAuthIdentityUniqueViolation,
} from './external-auth-identity-unique-violation';

function createUniqueViolation(constraint: string, code = '23505'): QueryFailedError {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('database_error'), {
      code,
      constraint,
    }),
  );
}

describe('mapExternalAuthIdentityUniqueViolation', () => {
  it('maps a user-provider unique violation to already linked', () => {
    const mappedCode = mapExternalAuthIdentityUniqueViolation(
      createUniqueViolation(EXTERNAL_AUTH_IDENTITY_USER_PROVIDER_UNIQUE),
    );

    assert.equal(mappedCode, 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED');
  });

  it('maps a provider-subject unique violation to conflict', () => {
    const mappedCode = mapExternalAuthIdentityUniqueViolation(
      createUniqueViolation(EXTERNAL_AUTH_IDENTITY_PROVIDER_SUBJECT_UNIQUE),
    );

    assert.equal(mappedCode, 'AUTH_EXTERNAL_IDENTITY_CONFLICT');
  });

  it('maps an unknown unique violation to a safe conflict', () => {
    const mappedCode = mapExternalAuthIdentityUniqueViolation(
      createUniqueViolation('unexpected_unique_constraint'),
    );

    assert.equal(mappedCode, 'AUTH_EXTERNAL_IDENTITY_CONFLICT');
  });

  it('ignores non-unique database errors', () => {
    const mappedCode = mapExternalAuthIdentityUniqueViolation(
      createUniqueViolation(EXTERNAL_AUTH_IDENTITY_PROVIDER_SUBJECT_UNIQUE, '23503'),
    );

    assert.equal(mappedCode, null);
  });
});
