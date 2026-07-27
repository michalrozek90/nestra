import { readFileSync } from 'node:fs';

/**
 * Parses a dotenv-style file into key/value pairs without mutating process.env.
 * Supports simple KEY=VALUE lines; ignores blank lines and comments.
 */
export function parseEnvFile(filePath) {
  const fileContents = readFileSync(filePath, 'utf8');
  const values = {};

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      throw new Error(`Invalid environment line in ${filePath}: ${rawLine}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

export function applyEnvFile(filePath, targetEnv = process.env) {
  const values = parseEnvFile(filePath);

  for (const [key, value] of Object.entries(values)) {
    targetEnv[key] = value;
  }

  return values;
}
