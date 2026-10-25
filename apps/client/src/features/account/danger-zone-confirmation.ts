export function matchesDangerZoneConfirmation(typedText: string, requiredText: string): boolean {
  const normalizedRequiredText = requiredText.trim();

  if (normalizedRequiredText.length === 0) {
    return false;
  }

  return typedText.trim() === normalizedRequiredText;
}
