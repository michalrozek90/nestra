import { runtimeConfig } from '@/config/runtime-config';
import { ConsoleLogger } from './console-logger';
import type { Logger } from './logger.types';

export const logger: Logger = new ConsoleLogger(
  runtimeConfig.environment,
  runtimeConfig.isVerboseLoggingEnabled,
);

export type { LogContext, LogPrimitive, LogValue, Logger } from './logger.types';
