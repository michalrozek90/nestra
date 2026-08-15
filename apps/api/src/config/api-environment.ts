import { isIP } from 'node:net';

import { z } from 'zod';

const durationSchema = z.string().regex(/^[1-9]\d*[smhd]$/);
const exampleJwtAccessSecret = 'replace_with_a_long_random_secret';
const googleOAuthCallbackPath = '/api/v1/auth/google/callback';
const googleOAuthWebReturnPath = '/auth/google/callback';
const googleOAuthApplicationReturnPath = '/oauth/google';
const googleOAuthMobileDevelopmentScheme = 'com.michalrozek.nestra:';
const googleOAuthDesktopScheme = 'com.michalrozek.nestra.desktop:';

function isCanonicalCorsAllowedOrigin(origin: string): boolean {
  try {
    return new URL(origin).origin === origin;
  } catch {
    return false;
  }
}

function usesAllowedDatabaseTransport(databaseUrl: string): boolean {
  const parsedDatabaseUrl = new URL(databaseUrl);
  const localDatabaseHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);
  const sslMode = parsedDatabaseUrl.searchParams.get('sslmode');
  const usesLibpqCompatibility = parsedDatabaseUrl.searchParams.get('uselibpqcompat') === 'true';

  return (
    localDatabaseHosts.has(parsedDatabaseUrl.hostname) ||
    sslMode === 'verify-full' ||
    (sslMode === 'require' && !usesLibpqCompatibility)
  );
}

const corsAllowedOriginSchema = z
  .url({ protocol: /^https?$/ })
  .refine(isCanonicalCorsAllowedOrigin, {
    message: 'CORS origins must use canonical HTTP(S) origin syntax.',
  });

const googleOAuthEnabledSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');
const googleOAuthEnvironmentValueSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim() === value, {
    message: 'Must not contain surrounding whitespace.',
  });

type GoogleOAuthEnvironment =
  | { readonly enabled: false }
  | {
      readonly enabled: true;
      readonly clientId: string;
      readonly clientSecret: string;
      readonly callbackUri: string;
      readonly transactionEncryptionKey: Buffer;
      readonly returnUris: {
        readonly web: string;
        readonly android: string;
        readonly ios: string;
        readonly desktop: string;
      };
    };

type GoogleOAuthUriRequirements = {
  readonly expectedPath: string;
  readonly isDevelopment: boolean;
  readonly allowedPrivateScheme?: string | undefined;
  readonly allowHttps?: boolean;
};

function isSafeGoogleOAuthUri(uri: string, requirements: GoogleOAuthUriRequirements): boolean {
  try {
    const parsedUri = new URL(uri);
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsedUri.hostname);
    const isIpAddress = isIP(parsedUri.hostname.replace(/^\[|\]$/g, '')) !== 0;
    const isDevelopmentLoopback =
      requirements.isDevelopment && parsedUri.protocol === 'http:' && isLoopback;
    const isAllowedHttps =
      requirements.allowHttps !== false &&
      parsedUri.protocol === 'https:' &&
      !isIpAddress &&
      (requirements.isDevelopment || !isLoopback);
    const isAllowedPrivateScheme =
      requirements.allowedPrivateScheme !== undefined &&
      parsedUri.protocol === requirements.allowedPrivateScheme &&
      parsedUri.host.length === 0;

    return (
      uri.trim() === uri &&
      parsedUri.hash.length === 0 &&
      parsedUri.username.length === 0 &&
      parsedUri.password.length === 0 &&
      parsedUri.search.length === 0 &&
      parsedUri.pathname === requirements.expectedPath &&
      (isAllowedHttps || isDevelopmentLoopback || isAllowedPrivateScheme)
    );
  } catch {
    return false;
  }
}

function isCanonicalGoogleOAuthEncryptionKey(value: string): boolean {
  const decodedKey = Buffer.from(value, 'base64');
  return decodedKey.length === 32 && decodedKey.toString('base64') === value;
}

function requiredGoogleValue(value: string | undefined): string {
  if (value === undefined) {
    throw new Error('Google OAuth configuration was not validated.');
  }
  return value;
}

const rawApiEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'preview', 'production']),
    API_HOST: z.string().min(1),
    API_PORT: z.coerce.number().int().min(1).max(65_535),
    DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: durationSchema,
    REFRESH_SESSION_EXPIRES_IN: durationSchema,
    CORS_ALLOWED_ORIGINS: z
      .string()
      .transform((origins) => origins.split(',').map((origin) => origin.trim()))
      .pipe(z.array(corsAllowedOriginSchema).min(1)),
    GOOGLE_OAUTH_ENABLED: googleOAuthEnabledSchema,
    GOOGLE_OAUTH_CLIENT_ID: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_CALLBACK_URI: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_WEB_RETURN_URI: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_ANDROID_RETURN_URI: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_IOS_RETURN_URI: googleOAuthEnvironmentValueSchema.optional(),
    GOOGLE_OAUTH_DESKTOP_RETURN_URI: googleOAuthEnvironmentValueSchema.optional(),
  })
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV !== 'development' &&
      environment.JWT_ACCESS_SECRET === exampleJwtAccessSecret
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'The example JWT access secret is not allowed outside development.',
      });
    }

    if (
      environment.NODE_ENV !== 'development' &&
      !usesAllowedDatabaseTransport(environment.DATABASE_URL)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'Remote DATABASE_URL values must require verified TLS outside development.',
      });
    }

    if (
      environment.NODE_ENV !== 'development' &&
      environment.CORS_ALLOWED_ORIGINS.some(
        (origin) => !origin.startsWith('https://') && origin !== 'http://tauri.localhost',
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ALLOWED_ORIGINS'],
        message: 'Browser origins must use HTTPS outside development, except packaged Tauri.',
      });
    }

    if (environment.GOOGLE_OAUTH_ENABLED) {
      const googleFields = [
        'GOOGLE_OAUTH_CLIENT_ID',
        'GOOGLE_OAUTH_CLIENT_SECRET',
        'GOOGLE_OAUTH_CALLBACK_URI',
        'GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY',
        'GOOGLE_OAUTH_WEB_RETURN_URI',
        'GOOGLE_OAUTH_ANDROID_RETURN_URI',
        'GOOGLE_OAUTH_IOS_RETURN_URI',
        'GOOGLE_OAUTH_DESKTOP_RETURN_URI',
      ] as const;

      for (const field of googleFields) {
        if (environment[field] === undefined) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: 'Required when Google OAuth is enabled.',
          });
        }
      }

      const key = environment.GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY;
      if (key !== undefined && !isCanonicalGoogleOAuthEncryptionKey(key)) {
        context.addIssue({
          code: 'custom',
          path: ['GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY'],
          message: 'Must be exactly 32 bytes encoded as canonical base64.',
        });
      }

      const callbackUri = environment.GOOGLE_OAUTH_CALLBACK_URI;
      if (
        callbackUri !== undefined &&
        !isSafeGoogleOAuthUri(callbackUri, {
          expectedPath: googleOAuthCallbackPath,
          isDevelopment: environment.NODE_ENV === 'development',
        })
      ) {
        context.addIssue({
          code: 'custom',
          path: ['GOOGLE_OAUTH_CALLBACK_URI'],
          message:
            'Must use the exact Google callback path and canonical HTTPS, or loopback HTTP in development.',
        });
      }

      const returnUriRequirements = [
        [
          'GOOGLE_OAUTH_WEB_RETURN_URI',
          {
            expectedPath: googleOAuthWebReturnPath,
          },
        ],
        [
          'GOOGLE_OAUTH_ANDROID_RETURN_URI',
          {
            expectedPath: googleOAuthApplicationReturnPath,
            allowedPrivateScheme:
              environment.NODE_ENV === 'development'
                ? googleOAuthMobileDevelopmentScheme
                : undefined,
            allowHttps: environment.NODE_ENV !== 'development',
          },
        ],
        [
          'GOOGLE_OAUTH_IOS_RETURN_URI',
          {
            expectedPath: googleOAuthApplicationReturnPath,
            allowedPrivateScheme:
              environment.NODE_ENV === 'development'
                ? googleOAuthMobileDevelopmentScheme
                : undefined,
            allowHttps: environment.NODE_ENV !== 'development',
          },
        ],
        [
          'GOOGLE_OAUTH_DESKTOP_RETURN_URI',
          {
            expectedPath: googleOAuthApplicationReturnPath,
            allowedPrivateScheme: googleOAuthDesktopScheme,
            allowHttps: false,
          },
        ],
      ] as const;

      for (const [field, requirements] of returnUriRequirements) {
        const uri = environment[field];
        if (
          uri !== undefined &&
          !isSafeGoogleOAuthUri(uri, {
            ...requirements,
            isDevelopment: environment.NODE_ENV === 'development',
          })
        ) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: 'Must use the platform return path and an environment-safe canonical URI.',
          });
        }
      }
    }
  })
  .transform((environment) => ({
    nodeEnvironment: environment.NODE_ENV,
    apiHost: environment.API_HOST,
    apiPort: environment.API_PORT,
    databaseUrl: environment.DATABASE_URL,
    jwtAccessSecret: environment.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: environment.JWT_ACCESS_EXPIRES_IN,
    refreshSessionExpiresIn: environment.REFRESH_SESSION_EXPIRES_IN,
    corsAllowedOrigins: environment.CORS_ALLOWED_ORIGINS,
    googleOAuth: environment.GOOGLE_OAUTH_ENABLED
      ? ({
          enabled: true as const,
          clientId: requiredGoogleValue(environment.GOOGLE_OAUTH_CLIENT_ID),
          clientSecret: requiredGoogleValue(environment.GOOGLE_OAUTH_CLIENT_SECRET),
          callbackUri: requiredGoogleValue(environment.GOOGLE_OAUTH_CALLBACK_URI),
          transactionEncryptionKey: Buffer.from(
            requiredGoogleValue(environment.GOOGLE_OAUTH_TRANSACTION_ENCRYPTION_KEY),
            'base64',
          ),
          returnUris: {
            web: requiredGoogleValue(environment.GOOGLE_OAUTH_WEB_RETURN_URI),
            android: requiredGoogleValue(environment.GOOGLE_OAUTH_ANDROID_RETURN_URI),
            ios: requiredGoogleValue(environment.GOOGLE_OAUTH_IOS_RETURN_URI),
            desktop: requiredGoogleValue(environment.GOOGLE_OAUTH_DESKTOP_RETURN_URI),
          },
        } satisfies GoogleOAuthEnvironment)
      : ({ enabled: false as const } satisfies GoogleOAuthEnvironment),
  }));

export type ApiEnvironment = z.infer<typeof rawApiEnvironmentSchema>;

function hasConfiguredApiPort(apiPort: unknown): boolean {
  if (typeof apiPort === 'number') {
    return Number.isFinite(apiPort);
  }

  return typeof apiPort === 'string' && apiPort.trim().length > 0;
}

function withPlatformPortFallback(
  environmentVariables: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  if (hasConfiguredApiPort(environmentVariables.API_PORT)) {
    return { ...environmentVariables };
  }

  return {
    ...environmentVariables,
    API_PORT: environmentVariables.PORT,
  };
}

export function parseApiEnvironment(
  environmentVariables: Readonly<Record<string, unknown>>,
): ApiEnvironment {
  const parseResult = rawApiEnvironmentSchema.safeParse(
    withPlatformPortFallback(environmentVariables),
  );

  if (!parseResult.success) {
    const invalidFields = parseResult.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} (${issue.code})`)
      .join(', ');

    throw new Error(`Invalid API environment configuration: ${invalidFields}`);
  }

  return parseResult.data;
}
