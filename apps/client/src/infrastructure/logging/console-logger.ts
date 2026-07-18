import { apiErrorResponseSchema } from '@nestra/contracts';
import { isAxiosError } from 'axios';

import type { ApplicationEnvironment } from '@/config/runtime-config';
import type { LogContext, LogValue, Logger } from './logger.types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MINIMUM_LEVEL: Readonly<Record<ApplicationEnvironment, LogLevel>> = {
  development: 'debug',
  preview: 'info',
  production: 'warn',
};

const SENSITIVE_CONTEXT_KEY =
  /(authorization|password|token|secret|credential|noteContent|content|draft)/i;
const SAFE_ERROR_NAMES: ReadonlySet<string> = new Set([
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
]);

function sanitizeText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

function sanitizeLogValue(logValue: LogValue, contextKey?: string): LogValue {
  if (contextKey && SENSITIVE_CONTEXT_KEY.test(contextKey)) {
    return '[redacted]';
  }

  if (typeof logValue === 'string') {
    return sanitizeText(logValue);
  }

  if (Array.isArray(logValue)) {
    return logValue.map((entry) => sanitizeLogValue(entry));
  }

  if (typeof logValue === 'object' && logValue !== null) {
    return Object.fromEntries(
      Object.entries(logValue).map(([key, nestedValue]) => [
        key,
        sanitizeLogValue(nestedValue, key),
      ]),
    );
  }

  return logValue;
}

function sanitizeContext(context: LogContext | undefined): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, logValue]) => [key, sanitizeLogValue(logValue, key)]),
  );
}

function getSafeErrorName(errorName: string): string {
  return SAFE_ERROR_NAMES.has(errorName) ? errorName : 'Error';
}

function getSafeDevelopmentStack(stack: string | undefined): string | undefined {
  if (!stack) {
    return undefined;
  }

  const safeStackFrames = stack
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => /^\s*at\s/.test(line) || /^\s*[^@\s]+@.+:\d+:\d+\s*$/.test(line))
    .slice(0, 20)
    .map((line) => sanitizeText(line));

  return safeStackFrames.length > 0 ? safeStackFrames.join('\n') : undefined;
}

function normalizeError(error: unknown, environment: ApplicationEnvironment): LogContext {
  if (isAxiosError(error)) {
    const parsedApiError = apiErrorResponseSchema.safeParse(error.response?.data);
    const safeStack =
      environment === 'development' ? getSafeDevelopmentStack(error.stack) : undefined;

    return {
      name: 'AxiosError',
      message: 'API request failed',
      ...(error.code ? { networkErrorCode: sanitizeText(error.code) } : {}),
      ...(error.response?.status ? { statusCode: error.response.status } : {}),
      ...(parsedApiError.success
        ? {
            apiErrorCode: parsedApiError.data.errorCode,
            ...(parsedApiError.data.requestId ? { requestId: parsedApiError.data.requestId } : {}),
          }
        : {}),
      ...(safeStack ? { stack: safeStack } : {}),
    };
  }

  if (error instanceof Error) {
    const safeStack =
      environment === 'development' ? getSafeDevelopmentStack(error.stack) : undefined;

    return {
      name: getSafeErrorName(error.name),
      message: 'An operation failed',
      ...(safeStack ? { stack: safeStack } : {}),
    };
  }

  return {
    name: 'UnknownError',
    message: 'An unknown error was reported',
  };
}

export class ConsoleLogger implements Logger {
  public constructor(
    private readonly environment: ApplicationEnvironment,
    private readonly isVerboseLoggingEnabled: boolean,
  ) {}

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug('[Nestra]', sanitizeText(message), sanitizeContext(context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info('[Nestra]', sanitizeText(message), sanitizeContext(context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn('[Nestra]', sanitizeText(message), sanitizeContext(context));
    }
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(
        '[Nestra]',
        sanitizeText(message),
        error === undefined ? undefined : normalizeError(error, this.environment),
        sanitizeContext(context),
      );
    }
  }

  private shouldLog(logLevel: LogLevel): boolean {
    if (logLevel === 'debug' && !this.isVerboseLoggingEnabled) {
      return false;
    }

    return LOG_LEVEL_PRIORITY[logLevel] >= LOG_LEVEL_PRIORITY[MINIMUM_LEVEL[this.environment]];
  }
}
