import type { AuthenticationSessionResponse, GoogleAuthStartResponse } from '@nestra/contracts';
import { describe, expect, it, vi } from 'vitest';

import { GoogleAuthFlowController } from './google-auth-flow';
import type {
  ExternalAuthBrowserResult,
  GoogleAuthErrorKey,
  PendingExternalAuth,
  PendingExternalAuthStorage,
} from './google-auth.types';

const TRANSACTION_ID = '11111111-1111-4111-8111-111111111111';
const HANDOFF_VERIFIER = 'a'.repeat(43);
const HANDOFF_CHALLENGE = 'b'.repeat(43);
const RETURN_URI = 'https://client.example/auth/google/callback';
const CALLBACK_URL = `${RETURN_URI}?handoff=${TRANSACTION_ID}.secret`;
const FUTURE_TIMESTAMP = '2030-01-01T00:10:00.000Z';
const CURRENT_TIMESTAMP_MS = Date.parse('2030-01-01T00:00:00.000Z');

const SESSION: AuthenticationSessionResponse = {
  user: {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'reader@example.com',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresAt: '2030-01-01T00:15:00.000Z',
  refreshSessionExpiresAt: '2030-02-01T00:00:00.000Z',
};

type TestError = { readonly code?: string; readonly key?: GoogleAuthErrorKey };

class MemoryPendingStorage implements PendingExternalAuthStorage {
  public pendingAuth: PendingExternalAuth | null = null;
  public clearCount = 0;

  public async read(): Promise<PendingExternalAuth | null> {
    return this.pendingAuth;
  }

  public async write(pendingAuth: PendingExternalAuth): Promise<void> {
    this.pendingAuth = pendingAuth;
  }

  public async clear(): Promise<void> {
    this.clearCount += 1;
    this.pendingAuth = null;
  }
}

function createStartResponse(transactionExpiresAt = FUTURE_TIMESTAMP): GoogleAuthStartResponse {
  return {
    transactionId: TRANSACTION_ID,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    transactionExpiresAt,
  };
}

function createController(
  browserResult: ExternalAuthBrowserResult = { type: 'callback', callbackUrl: CALLBACK_URL },
  createHandoffProof = vi.fn(async () => ({
    handoffVerifier: HANDOFF_VERIFIER,
    handoffChallenge: HANDOFF_CHALLENGE,
  })),
) {
  const pendingStorage = new MemoryPendingStorage();
  const browser = {
    prepareAuthorization: vi.fn(),
    openAuthorization: vi.fn(async () => browserResult),
    dismissPreparedAuthorization: vi.fn(),
  };
  const startSignIn = vi.fn(async () => createStartResponse());
  const exchangeSignIn = vi.fn(async () => SESSION);
  const login = vi.fn(async () => SESSION);
  const startLink = vi.fn(async () => createStartResponse());
  const exchangeLink = vi.fn(async () => ({
    provider: 'google' as const,
    email: 'reader@example.com',
    linkedAt: '2030-01-01T00:00:00.000Z',
  }));
  const stageAuthentication = vi.fn(async () => undefined);
  const activateAuthentication = vi.fn();
  const completeAuthentication = vi.fn(async () => undefined);
  const navigateToNotes = vi.fn();
  const controller = new GoogleAuthFlowController({
    browser,
    pendingStorage,
    platform: 'web',
    returnUri: RETURN_URI,
    createHandoffProof,
    startSignIn,
    exchangeSignIn,
    login,
    startLink,
    exchangeLink,
    stageAuthentication,
    activateAuthentication,
    completeAuthentication,
    navigateToNotes,
    getApiErrorCode: (error) => (error as TestError).code ?? null,
    getErrorKey: (error) => (error as TestError).key ?? 'errors.unexpected',
    now: () => CURRENT_TIMESTAMP_MS,
  });

  return {
    browser,
    activateAuthentication,
    completeAuthentication,
    controller,
    createHandoffProof,
    exchangeLink,
    exchangeSignIn,
    login,
    navigateToNotes,
    pendingStorage,
    stageAuthentication,
    startLink,
    startSignIn,
  };
}

describe('GoogleAuthFlowController', () => {
  it('transitions through sign-in and completes the existing Nestra session', async () => {
    const testFlow = createController();

    await testFlow.controller.startSignIn();

    expect(testFlow.startSignIn).toHaveBeenCalledOnce();
    expect(testFlow.exchangeSignIn).toHaveBeenCalledWith({
      handoffCode: `${TRANSACTION_ID}.secret`,
      handoffVerifier: HANDOFF_VERIFIER,
    });
    expect(testFlow.completeAuthentication).toHaveBeenCalledWith(SESSION);
    expect(testFlow.navigateToNotes).toHaveBeenCalledOnce();
    expect(testFlow.pendingStorage.pendingAuth).toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
  });

  it('ignores duplicate taps while a start operation is pending', async () => {
    let releaseProof: (() => void) | undefined;
    const proofGate = new Promise<void>((resolve) => {
      releaseProof = resolve;
    });
    const createProof = vi.fn(async () => {
      await proofGate;
      return {
        handoffVerifier: HANDOFF_VERIFIER,
        handoffChallenge: HANDOFF_CHALLENGE,
      };
    });
    const testFlow = createController({ type: 'cancelled' }, createProof);

    const firstAttempt = testFlow.controller.startSignIn();
    const secondAttempt = testFlow.controller.startSignIn();
    releaseProof?.();
    await Promise.all([firstAttempt, secondAttempt]);

    expect(createProof).toHaveBeenCalledOnce();
    expect(testFlow.startSignIn).toHaveBeenCalledOnce();
    expect(testFlow.browser.openAuthorization).toHaveBeenCalledOnce();
    expect(testFlow.browser.prepareAuthorization).toHaveBeenCalledOnce();
    expect(testFlow.browser.dismissPreparedAuthorization).toHaveBeenCalledOnce();
    expect(testFlow.browser.prepareAuthorization.mock.invocationCallOrder[0]).toBeLessThan(
      createProof.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('treats browser cancellation as a stable non-error state', async () => {
    const testFlow = createController({ type: 'cancelled' });

    await testFlow.controller.startSignIn();

    expect(testFlow.exchangeSignIn).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
    expect(testFlow.pendingStorage.pendingAuth).toBeNull();
  });

  it('reports a browser popup failure without starting a provider transaction', async () => {
    const testFlow = createController();
    testFlow.browser.prepareAuthorization.mockImplementationOnce(() => {
      throw { key: 'errors.google.provider' } satisfies TestError;
    });

    await testFlow.controller.startSignIn();

    expect(testFlow.startSignIn).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'errors.google.provider',
      tone: 'error',
    });
  });

  it('requests ownership confirmation and links Google after password authentication', async () => {
    const testFlow = createController();
    testFlow.exchangeSignIn.mockRejectedValueOnce({ code: 'AUTH_ACCOUNT_LINK_REQUIRED' });

    await testFlow.controller.startSignIn();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'link-required' });

    await testFlow.controller.confirmLink({
      email: 'reader@example.com',
      password: 'password',
    });

    expect(testFlow.login).toHaveBeenCalledOnce();
    expect(testFlow.stageAuthentication).toHaveBeenCalledWith(SESSION);
    expect(testFlow.completeAuthentication).not.toHaveBeenCalled();
    expect(testFlow.startLink).toHaveBeenCalledWith({
      platform: 'web',
      handoffChallenge: HANDOFF_CHALLENGE,
      currentPassword: 'password',
    });
    expect(testFlow.exchangeLink).toHaveBeenCalledOnce();
    expect(testFlow.activateAuthentication).toHaveBeenCalledWith(SESSION.user);
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'google.feedback.linked',
      tone: 'success',
    });
  });

  it('keeps password sign-in stable when Google linking is cancelled', async () => {
    const testFlow = createController();
    testFlow.exchangeSignIn.mockRejectedValueOnce({ code: 'AUTH_ACCOUNT_LINK_REQUIRED' });
    await testFlow.controller.startSignIn();
    testFlow.browser.openAuthorization.mockResolvedValueOnce({ type: 'cancelled' });

    await testFlow.controller.confirmLink({
      email: 'reader@example.com',
      password: 'password',
    });

    expect(testFlow.stageAuthentication).toHaveBeenCalledWith(SESSION);
    expect(testFlow.completeAuthentication).not.toHaveBeenCalled();
    expect(testFlow.activateAuthentication).toHaveBeenCalledWith(SESSION.user);
    expect(testFlow.exchangeLink).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'google.feedback.linkCancelled',
      tone: 'neutral',
    });
  });

  it('does not publish the password session before the desktop link exchange succeeds', async () => {
    const testFlow = createController();
    testFlow.exchangeSignIn.mockRejectedValueOnce({ code: 'AUTH_ACCOUNT_LINK_REQUIRED' });
    await testFlow.controller.startSignIn();
    testFlow.browser.openAuthorization.mockResolvedValueOnce({ type: 'opened' });

    await testFlow.controller.confirmLink({
      email: 'reader@example.com',
      password: 'password',
    });

    expect(testFlow.stageAuthentication).toHaveBeenCalledWith(SESSION);
    expect(testFlow.activateAuthentication).not.toHaveBeenCalled();
    expect(testFlow.navigateToNotes).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'pending', intent: 'link' });

    await testFlow.controller.resumeCallback(CALLBACK_URL);

    expect(testFlow.exchangeLink).toHaveBeenCalledOnce();
    expect(testFlow.activateAuthentication).toHaveBeenCalledWith(SESSION.user);
    expect(testFlow.navigateToNotes).toHaveBeenCalledOnce();
  });

  it('clears a pending operation and returns to idle when authentication is reset', async () => {
    const testFlow = createController({ type: 'opened' });
    await testFlow.controller.startSignIn();

    expect(testFlow.pendingStorage.pendingAuth).not.toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'pending', intent: 'sign-in' });

    await testFlow.controller.reset();

    expect(testFlow.pendingStorage.pendingAuth).toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
  });

  it('ignores a link exchange that finishes after authentication is reset', async () => {
    let releaseExchange: (() => void) | undefined;
    let signalExchangeStarted: (() => void) | undefined;
    const exchangeGate = new Promise<void>((resolve) => {
      releaseExchange = resolve;
    });
    const exchangeStarted = new Promise<void>((resolve) => {
      signalExchangeStarted = resolve;
    });
    const testFlow = createController();
    testFlow.exchangeSignIn.mockRejectedValueOnce({ code: 'AUTH_ACCOUNT_LINK_REQUIRED' });
    await testFlow.controller.startSignIn();
    testFlow.browser.openAuthorization.mockResolvedValueOnce({ type: 'opened' });
    await testFlow.controller.confirmLink({
      email: 'reader@example.com',
      password: 'password',
    });
    testFlow.exchangeLink.mockImplementationOnce(async () => {
      signalExchangeStarted?.();
      await exchangeGate;
      return {
        provider: 'google',
        email: 'reader@example.com',
        linkedAt: '2030-01-01T00:00:00.000Z',
      };
    });

    const callbackOperation = testFlow.controller.resumeCallback(CALLBACK_URL);
    await exchangeStarted;
    const resetOperation = testFlow.controller.reset();
    releaseExchange?.();
    await Promise.all([callbackOperation, resetOperation]);

    expect(testFlow.activateAuthentication).not.toHaveBeenCalled();
    expect(testFlow.navigateToNotes).not.toHaveBeenCalled();
    expect(testFlow.pendingStorage.pendingAuth).toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
  });

  it.each([
    ['provider failure', { code: 'AUTH_GOOGLE_PROVIDER_ERROR', key: 'errors.google.provider' }],
    ['network failure', { key: 'errors.google.network' }],
    ['timeout', { key: 'errors.google.network' }],
  ] as const)('localizes %s without exposing raw errors', async (_label, flowError) => {
    const testFlow = createController();
    testFlow.startSignIn.mockRejectedValueOnce(flowError);

    await testFlow.controller.startSignIn();

    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: flowError.key,
      tone: 'error',
    });
  });

  it('rejects a malformed callback before exchange', async () => {
    const testFlow = createController({
      type: 'callback',
      callbackUrl: `${RETURN_URI}?handoff=wrong.secret&extra=value`,
    });

    await testFlow.controller.startSignIn();

    expect(testFlow.exchangeSignIn).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'errors.google.invalidCallback',
      tone: 'error',
    });
  });

  it('rejects an expired handoff before exchange', async () => {
    const testFlow = createController();
    testFlow.startSignIn.mockResolvedValueOnce(createStartResponse('2029-12-31T23:59:00.000Z'));

    await testFlow.controller.startSignIn();

    expect(testFlow.exchangeSignIn).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'errors.google.expiredHandoff',
      tone: 'error',
    });
  });

  it('ignores a stale callback when no pending flow exists', async () => {
    const testFlow = createController();

    await testFlow.controller.resumeCallback(CALLBACK_URL);

    expect(testFlow.exchangeSignIn).not.toHaveBeenCalled();
    expect(testFlow.completeAuthentication).not.toHaveBeenCalled();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
  });

  it('ignores callback URLs outside the exact configured desktop return location', async () => {
    const testFlow = createController();
    testFlow.pendingStorage.pendingAuth = {
      intent: 'sign-in',
      platform: 'desktop',
      transactionId: TRANSACTION_ID,
      transactionExpiresAt: FUTURE_TIMESTAMP,
      handoffVerifier: HANDOFF_VERIFIER,
    };

    await testFlow.controller.resumeCallback(
      `com.michalrozek.nestra.desktop:/oauth/other?handoff=${TRANSACTION_ID}.secret`,
    );

    expect(testFlow.exchangeSignIn).not.toHaveBeenCalled();
    expect(testFlow.pendingStorage.pendingAuth).not.toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({ status: 'idle' });
  });

  it('serializes duplicate callback delivery into one handoff exchange', async () => {
    let releaseExchange: (() => void) | undefined;
    const exchangeGate = new Promise<void>((resolve) => {
      releaseExchange = resolve;
    });
    const testFlow = createController();
    testFlow.pendingStorage.pendingAuth = {
      intent: 'sign-in',
      platform: 'desktop',
      transactionId: TRANSACTION_ID,
      transactionExpiresAt: FUTURE_TIMESTAMP,
      handoffVerifier: HANDOFF_VERIFIER,
    };
    testFlow.exchangeSignIn.mockImplementationOnce(async () => {
      await exchangeGate;
      return SESSION;
    });

    const firstDelivery = testFlow.controller.resumeCallback(CALLBACK_URL);
    const duplicateDelivery = testFlow.controller.resumeCallback(CALLBACK_URL);
    releaseExchange?.();
    await Promise.all([firstDelivery, duplicateDelivery]);

    expect(testFlow.exchangeSignIn).toHaveBeenCalledOnce();
    expect(testFlow.completeAuthentication).toHaveBeenCalledOnce();
  });

  it('cannot authenticate when the API rejects a forged handoff', async () => {
    const testFlow = createController();
    testFlow.pendingStorage.pendingAuth = {
      intent: 'sign-in',
      platform: 'desktop',
      transactionId: TRANSACTION_ID,
      transactionExpiresAt: FUTURE_TIMESTAMP,
      handoffVerifier: HANDOFF_VERIFIER,
    };
    testFlow.exchangeSignIn.mockRejectedValueOnce({
      code: 'AUTH_GOOGLE_HANDOFF_INVALID',
      key: 'errors.google.invalidCallback',
    } satisfies TestError);

    await testFlow.controller.resumeCallback(CALLBACK_URL);

    expect(testFlow.completeAuthentication).not.toHaveBeenCalled();
    expect(testFlow.pendingStorage.pendingAuth).toBeNull();
    expect(testFlow.controller.getSnapshot()).toEqual({
      status: 'feedback',
      messageKey: 'errors.google.invalidCallback',
      tone: 'error',
    });
  });
});
