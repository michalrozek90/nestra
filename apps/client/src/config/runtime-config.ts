import Constants from 'expo-constants';
import { z } from 'zod';

export const APPLICATION_ENVIRONMENTS = ['development', 'preview', 'production'] as const;

export type ApplicationEnvironment = (typeof APPLICATION_ENVIRONMENTS)[number];

export type RuntimeConfig = {
  readonly applicationVersion: string;
  readonly environment: ApplicationEnvironment;
  readonly apiBaseUrl: string;
  readonly showDeveloperDiagnostics: boolean;
  readonly isVerboseLoggingEnabled: boolean;
};

const booleanStringSchema = z.enum(['true', 'false']).transform((text) => text === 'true');

const apiBaseUrlSchema = z
  .url()
  .refine((url) => url.startsWith('http://') || url.startsWith('https://'))
  .transform((url) => url.replace(/\/+$/, ''));

const runtimeConfigSchema = z.strictObject({
  applicationVersion: z.string().min(1),
  environment: z.enum(APPLICATION_ENVIRONMENTS),
  apiBaseUrl: apiBaseUrlSchema,
  showDeveloperDiagnostics: booleanStringSchema,
  isVerboseLoggingEnabled: booleanStringSchema,
});

function getApplicationVersion(): unknown {
  const expoExtra: unknown = Constants.expoConfig?.extra;

  if (typeof expoExtra !== 'object' || expoExtra === null || !('applicationVersion' in expoExtra)) {
    return undefined;
  }

  return expoExtra.applicationVersion;
}

function loadRuntimeConfig(): RuntimeConfig {
  const parsedConfig = runtimeConfigSchema.safeParse({
    applicationVersion: getApplicationVersion(),
    environment: process.env.EXPO_PUBLIC_APPLICATION_ENVIRONMENT,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    showDeveloperDiagnostics: process.env.EXPO_PUBLIC_SHOW_DEVELOPER_DIAGNOSTICS,
    isVerboseLoggingEnabled: process.env.EXPO_PUBLIC_VERBOSE_LOGGING,
  });

  if (!parsedConfig.success) {
    const invalidFields = [
      ...new Set(parsedConfig.error.issues.map((issue) => issue.path.join('.') || 'configuration')),
    ];
    throw new Error(`Invalid client runtime configuration: ${invalidFields.join(', ')}`);
  }

  return Object.freeze(parsedConfig.data);
}

export const runtimeConfig = loadRuntimeConfig();
