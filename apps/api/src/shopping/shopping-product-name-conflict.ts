import { QueryFailedError } from 'typeorm';

export const SHOPPING_PRODUCT_OWNER_NAME_KEY_UNIQUE = 'shopping_products_owner_name_key_unique';

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

export function isShoppingProductNameConflict(error: unknown): boolean {
  if (!(error instanceof QueryFailedError) || !isPostgresUniqueViolation(error)) {
    return false;
  }

  return readPostgresConstraintName(error) === SHOPPING_PRODUCT_OWNER_NAME_KEY_UNIQUE;
}
