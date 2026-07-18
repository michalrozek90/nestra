import { z } from 'zod';

const durationSchema = z.string().regex(/^[1-9]\d*[smhd]$/);
const exampleJwtAccessSecret = 'replace_with_a_long_random_secret';

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
      .pipe(z.array(z.url()).min(1)),
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

export function parseApiEnvironment(
  environmentVariables: Readonly<Record<string, unknown>>,
): ApiEnvironment {
  const parseResult = rawApiEnvironmentSchema.safeParse(environmentVariables);

  if (!parseResult.success) {
    const invalidFields = parseResult.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} (${issue.code})`)
      .join(', ');

    throw new Error(`Invalid API environment configuration: ${invalidFields}`);
  }

  return parseResult.data;
}
