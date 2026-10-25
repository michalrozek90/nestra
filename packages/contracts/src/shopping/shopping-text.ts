const redundantWhitespacePattern = /\s+/gu;

export function normalizeShoppingDisplayText(value: string): string {
  return value.trim().replace(redundantWhitespacePattern, ' ');
}

export function toShoppingComparisonKey(displayText: string): string {
  return normalizeShoppingDisplayText(displayText).toLowerCase();
}
