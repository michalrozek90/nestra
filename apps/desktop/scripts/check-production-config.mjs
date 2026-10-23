import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseEnvFile } from './load-env-file.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const desktopEnvironmentPath = path.join(repositoryRoot, 'apps/client/.env.desktop.example');
const desktopEnvironment = parseEnvFile(desktopEnvironmentPath);

const requiredValues = {
  EXPO_PUBLIC_APPLICATION_ENVIRONMENT: 'production',
  EXPO_PUBLIC_GOOGLE_AUTH_ENABLED: 'true',
};

const invalidVariables = Object.entries(requiredValues)
  .filter(([variableName, expectedValue]) => desktopEnvironment[variableName] !== expectedValue)
  .map(([variableName]) => variableName);

if (invalidVariables.length > 0) {
  console.error(
    `Desktop production configuration has invalid values for: ${invalidVariables.join(', ')}`,
  );
  process.exit(1);
}

console.log('Desktop production configuration checks passed.');
