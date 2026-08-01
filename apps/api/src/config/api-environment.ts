import { z } from 'zod';

const durationSchema = z.string().regex(/^[1-9]\d*[smhd]$/);
const exampleJwtAccessSecret = 'replace_with_a_long_random_secret';

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
