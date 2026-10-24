export function splitReleaseHistory<TReleaseNote>(releaseNotes: readonly TReleaseNote[]): {
  readonly earlier: readonly TReleaseNote[];
  readonly latest: TReleaseNote | null;
} {
  const [latest, ...earlier] = releaseNotes;

  return {
    earlier,
    latest: latest ?? null,
  };
}
