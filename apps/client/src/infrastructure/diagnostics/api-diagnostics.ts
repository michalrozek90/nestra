import { apiErrorResponseSchema } from '@nestra/contracts';
import { isAxiosError, type AxiosResponse } from 'axios';
import { useSyncExternalStore } from 'react';

export type ApiDiagnosticsSnapshot = {
  readonly lastSuccessfulRequestAt: string | null;
  readonly lastFailedRequestAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastRequestId: string | null;
};

const listeners = new Set<() => void>();

let snapshot: ApiDiagnosticsSnapshot = Object.freeze({
  lastSuccessfulRequestAt: null,
  lastFailedRequestAt: null,
  lastErrorCode: null,
  lastRequestId: null,
});

function getRequestId(response: AxiosResponse): string | null {
  const requestId: unknown = response.headers['x-request-id'];
  return typeof requestId === 'string' && requestId.length > 0 ? requestId : null;
}

function publish(nextSnapshot: ApiDiagnosticsSnapshot): void {
  snapshot = Object.freeze(nextSnapshot);
  listeners.forEach((listener) => listener());
}

export function recordSuccessfulApiRequest(response: AxiosResponse): void {
  publish({
    ...snapshot,
    lastSuccessfulRequestAt: new Date().toISOString(),
    lastRequestId: getRequestId(response) ?? snapshot.lastRequestId,
  });
}

export function recordFailedApiRequest(error: unknown): void {
  const parsedApiError = isAxiosError(error)
    ? apiErrorResponseSchema.safeParse(error.response?.data)
    : null;

  publish({
    ...snapshot,
    lastFailedRequestAt: new Date().toISOString(),
    lastErrorCode: parsedApiError?.success ? parsedApiError.data.errorCode : null,
    lastRequestId:
      parsedApiError?.success && parsedApiError.data.requestId
        ? parsedApiError.data.requestId
        : snapshot.lastRequestId,
  });
}

export function getApiDiagnosticsSnapshot(): ApiDiagnosticsSnapshot {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApiDiagnostics(): ApiDiagnosticsSnapshot {
  return useSyncExternalStore(subscribe, getApiDiagnosticsSnapshot, getApiDiagnosticsSnapshot);
}
