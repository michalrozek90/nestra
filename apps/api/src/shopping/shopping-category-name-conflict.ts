import { QueryFailedError } from 'typeorm';

export const SHOPPING_CATEGORY_OWNER_NAME_KEY_UNIQUE = 'shopping_categories_owner_name_key_unique';

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

export function isShoppingCategoryNameConflict(error: unknown): boolean {
  if (!(error instanceof QueryFailedError) || !isPostgresUniqueViolation(error)) {
    return false;
  }

  return readPostgresConstraintName(error) === SHOPPING_CATEGORY_OWNER_NAME_KEY_UNIQUE;
}
