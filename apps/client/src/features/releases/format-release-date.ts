export function formatReleaseDate(releaseDate: string | undefined, language: string): string {
  if (!releaseDate) {
    return '';
  }

  const parsedDate = new Date(`${releaseDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== releaseDate) {
    return '';
  }

  return parsedDate.toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  });
}
