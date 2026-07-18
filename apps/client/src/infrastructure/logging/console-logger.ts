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

function normalizeError(error: unknown, environment: ApplicationEnvironment): LogContext {
  if (isAxiosError(error)) {
    const parsedApiError = apiErrorResponseSchema.safeParse(error.response?.data);

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
      ...(environment === 'development' && error.stack ? { stack: sanitizeText(error.stack) } : {}),
    };
  }

  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name),
      message: sanitizeText(error.message),
      ...(environment === 'development' && error.stack ? { stack: sanitizeText(error.stack) } : {}),
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
