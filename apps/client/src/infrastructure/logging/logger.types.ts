export type LogPrimitive = string | number | boolean | null;

export type LogValue = LogPrimitive | readonly LogValue[] | { readonly [key: string]: LogValue };

export type LogContext = Readonly<Record<string, LogValue>>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}
