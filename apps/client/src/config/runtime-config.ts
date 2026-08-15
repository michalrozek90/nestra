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
  readonly isGoogleAuthEnabled: boolean;
  readonly googleAuthMobileReturnUri: string | null;
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
  // The provider action fails closed for existing deployments until explicitly enabled.
  isGoogleAuthEnabled: booleanStringSchema.default(false),
  googleAuthMobileReturnUri: z.string().min(1).nullable().default(null),
});

function getExpoConfigExtraValue(field: string): unknown {
  const expoExtra: unknown = Constants.expoConfig?.extra;

  if (typeof expoExtra !== 'object' || expoExtra === null || !(field in expoExtra)) {
    return undefined;
  }

  return Reflect.get(expoExtra, field);
}

function loadRuntimeConfig(): RuntimeConfig {
  const parsedConfig = runtimeConfigSchema.safeParse({
    applicationVersion: getExpoConfigExtraValue('applicationVersion'),
    environment: process.env.EXPO_PUBLIC_APPLICATION_ENVIRONMENT,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    showDeveloperDiagnostics: process.env.EXPO_PUBLIC_SHOW_DEVELOPER_DIAGNOSTICS,
    isVerboseLoggingEnabled: process.env.EXPO_PUBLIC_VERBOSE_LOGGING,
    isGoogleAuthEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
    googleAuthMobileReturnUri: getExpoConfigExtraValue('googleAuthMobileReturnUri'),
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
