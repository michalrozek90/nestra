export function toIsoDateTimeString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function getTimestampMilliseconds(value: Date | string): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(value).getTime();
}
