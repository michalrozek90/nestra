import { DefaultNamingStrategy } from 'typeorm';

function toSnakeCase(identifier: string): string {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s.-]+/g, '_')
    .toLowerCase();
}

export class SnakeCaseNamingStrategy extends DefaultNamingStrategy {
  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    // Entity decorators should define explicit plural table names because generic English
    // pluralization is not deterministic.
    return toSnakeCase(userSpecifiedName ?? targetName);
  }

  override columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return toSnakeCase([...embeddedPrefixes, customName ?? propertyName].join('_'));
  }

  override relationName(propertyName: string): string {
    return toSnakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string,
  ): string {
    return toSnakeCase(
      `${firstTableName}_${firstPropertyName.replaceAll('.', '_')}_${secondTableName}_${secondPropertyName}`,
    );
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return toSnakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
