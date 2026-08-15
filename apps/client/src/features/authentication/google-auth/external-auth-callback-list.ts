export function readSingleDesktopCallbackUrl(
  callbackUrls: readonly string[] | null,
): string | null {
  return callbackUrls?.length === 1 ? (callbackUrls[0] ?? null) : null;
}
