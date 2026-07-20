const durationPattern = /^([1-9]\d*)([smhd])$/;

export function parseDurationToMilliseconds(duration: string): number {
  const match = durationPattern.exec(duration);

  if (match === null) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

export function addDurationToDate(startDate: Date, duration: string): Date {
  const durationMilliseconds = parseDurationToMilliseconds(duration);

  return new Date(startDate.getTime() + durationMilliseconds);
}
