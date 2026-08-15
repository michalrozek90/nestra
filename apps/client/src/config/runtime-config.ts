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

function isIpAddressHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

function isSafeGoogleAuthMobileReturnUri(
  returnUri: string,
  environment: ApplicationEnvironment,
): boolean {
  try {
    const parsedReturnUri = new URL(returnUri);
    const isDevelopmentScheme =
      environment === 'development' &&
      parsedReturnUri.protocol === 'com.michalrozek.nestra:' &&
      parsedReturnUri.host.length === 0;
    const isProductionHttps =
      environment !== 'development' &&
      parsedReturnUri.protocol === 'https:' &&
      parsedReturnUri.port.length === 0 &&
      !isIpAddressHost(parsedReturnUri.hostname) &&
      !['localhost', '127.0.0.1', '[::1]'].includes(parsedReturnUri.hostname);

    return (
      returnUri.trim() === returnUri &&
      parsedReturnUri.pathname === '/oauth/google' &&
      parsedReturnUri.search.length === 0 &&
      parsedReturnUri.hash.length === 0 &&
      parsedReturnUri.username.length === 0 &&
      parsedReturnUri.password.length === 0 &&
      (isDevelopmentScheme || isProductionHttps)
    );
  } catch {
    return false;
  }
}

const runtimeConfigSchema = z
  .strictObject({
    applicationVersion: z.string().min(1),
    environment: z.enum(APPLICATION_ENVIRONMENTS),
    apiBaseUrl: apiBaseUrlSchema,
    showDeveloperDiagnostics: booleanStringSchema,
    isVerboseLoggingEnabled: booleanStringSchema,
    // The provider action fails closed for existing deployments until explicitly enabled.
    isGoogleAuthEnabled: booleanStringSchema.default(false),
    googleAuthMobileReturnUri: z.string().min(1).optional(),
  })
  .superRefine((configuration, context) => {
    const mobileReturnUri = configuration.googleAuthMobileReturnUri;
    if (
      mobileReturnUri !== undefined &&
      !isSafeGoogleAuthMobileReturnUri(mobileReturnUri, configuration.environment)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['googleAuthMobileReturnUri'],
        message: 'Must be the exact environment-safe mobile Google return URI.',
      });
    }
  })
  .transform((configuration) => ({
    ...configuration,
    googleAuthMobileReturnUri: configuration.googleAuthMobileReturnUri ?? null,
  }));

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
    isGoogleAuthEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
    googleAuthMobileReturnUri: process.env.EXPO_PUBLIC_GOOGLE_AUTH_MOBILE_RETURN_URI,
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
