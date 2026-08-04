import { QueryFailedError } from 'typeorm';

export const EXTERNAL_AUTH_IDENTITY_PROVIDER_SUBJECT_UNIQUE =
  'external_auth_identities_provider_provider_subject_unique';

export const EXTERNAL_AUTH_IDENTITY_USER_PROVIDER_UNIQUE =
  'external_auth_identities_user_id_provider_unique';

export type ExternalAuthIdentityUniqueViolationCode =
  'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED' | 'AUTH_EXTERNAL_IDENTITY_CONFLICT';

function readPostgresConstraintName(error: QueryFailedError): string | null {
  const driverError = error.driverError;

  if (
    typeof driverError !== 'object' ||
    driverError === null ||
    !('constraint' in driverError) ||
    typeof driverError.constraint !== 'string'
  ) {
    return null;
  }

  return driverError.constraint;
}

function isPostgresUniqueViolation(error: QueryFailedError): boolean {
  const driverError = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

export function mapExternalAuthIdentityUniqueViolation(
  error: unknown,
): ExternalAuthIdentityUniqueViolationCode | null {
  if (!(error instanceof QueryFailedError) || !isPostgresUniqueViolation(error)) {
    return null;
  }

  const constraintName = readPostgresConstraintName(error);

  if (constraintName === EXTERNAL_AUTH_IDENTITY_USER_PROVIDER_UNIQUE) {
    return 'AUTH_EXTERNAL_IDENTITY_ALREADY_LINKED';
  }

  if (constraintName === EXTERNAL_AUTH_IDENTITY_PROVIDER_SUBJECT_UNIQUE) {
    return 'AUTH_EXTERNAL_IDENTITY_CONFLICT';
  }

  return 'AUTH_EXTERNAL_IDENTITY_CONFLICT';
}
