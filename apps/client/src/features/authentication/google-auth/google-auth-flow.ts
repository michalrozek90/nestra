import type {
  AuthenticationSessionResponse,
  ExternalIdentityResponse,
  GoogleAuthExchangeRequest,
  GoogleAuthPlatform,
  GoogleAuthStartRequest,
  GoogleAuthStartResponse,
  GoogleLinkStartRequest,
  LoginRequest,
  PublicUser,
} from '@nestra/contracts';

import {
  ExpiredGoogleAuthCallbackError,
  InvalidGoogleAuthCallbackError,
  isGoogleAuthCallbackUrl,
  readGoogleHandoffCode,
  removeGoogleCallbackFromBrowserHistory,
} from './google-auth-callback';
import type { GoogleHandoffProof } from './google-auth-crypto';
import type {
  ExternalAuthBrowser,
  GoogleAuthErrorKey,
  GoogleAuthState,
  PendingExternalAuth,
  PendingExternalAuthStorage,
} from './google-auth.types';

type GoogleAuthFlowDependencies = {
  readonly browser: ExternalAuthBrowser;
  readonly pendingStorage: PendingExternalAuthStorage;
  readonly platform: GoogleAuthPlatform;
  readonly returnUri: string;
  readonly createHandoffProof: () => Promise<GoogleHandoffProof>;
  readonly startSignIn: (request: GoogleAuthStartRequest) => Promise<GoogleAuthStartResponse>;
  readonly exchangeSignIn: (
    request: GoogleAuthExchangeRequest,
  ) => Promise<AuthenticationSessionResponse>;
  readonly login: (request: LoginRequest) => Promise<AuthenticationSessionResponse>;
  readonly startLink: (request: GoogleLinkStartRequest) => Promise<GoogleAuthStartResponse>;
  readonly exchangeLink: (request: GoogleAuthExchangeRequest) => Promise<ExternalIdentityResponse>;
  readonly stageAuthentication: (session: AuthenticationSessionResponse) => Promise<void>;
  readonly activateAuthentication: (user: PublicUser) => void;
  readonly completeAuthentication: (session: AuthenticationSessionResponse) => Promise<void>;
  readonly navigateToNotes: () => void;
  readonly getApiErrorCode: (error: unknown) => string | null;
  readonly getErrorKey: (error: unknown) => GoogleAuthErrorKey;
  readonly now: () => number;
};

type StateListener = () => void;

export class GoogleAuthFlowController {
  private state: GoogleAuthState = { status: 'idle' };
  private readonly listeners = new Set<StateListener>();
  private activeOperation: Promise<void> | null = null;
  private operationGeneration = 0;
  private stagedLinkUser: PublicUser | null = null;

  public constructor(private readonly dependencies: GoogleAuthFlowDependencies) {}

  public readonly subscribe = (listener: StateListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public readonly getSnapshot = (): GoogleAuthState => this.state;

  public startSignIn(): Promise<void> {
    if (this.activeOperation || this.state.status === 'pending') {
      return this.activeOperation ?? Promise.resolve();
    }

    return this.runPreparedBrowserOperation('sign-in', async (operationGeneration) => {
      this.setState({ status: 'pending', intent: 'sign-in' });
      await this.startAuthorization('sign-in', operationGeneration);
    });
  }

  public confirmLink(request: LoginRequest): Promise<void> {
    if (this.activeOperation || this.state.status === 'pending') {
      return this.activeOperation ?? Promise.resolve();
    }

    return this.runPreparedBrowserOperation('link', async (operationGeneration) => {
      this.setState({ status: 'pending', intent: 'link' });
      try {
        const passwordSession = await this.dependencies.login(request);
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        await this.dependencies.stageAuthentication(passwordSession);
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        this.stagedLinkUser = passwordSession.user;
      } catch (error: unknown) {
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        this.setState({ status: 'link-required', errorKey: this.dependencies.getErrorKey(error) });
        return;
      }

      await this.startAuthorization('link', operationGeneration, request.password);
    });
  }

  public resumeCallback(callbackUrl: string): Promise<void> {
    if (!isGoogleAuthCallbackUrl(callbackUrl, this.dependencies.returnUri)) {
      return Promise.resolve();
    }

    if (this.activeOperation) {
      return this.activeOperation;
    }

    return this.runExclusive(async (operationGeneration) => {
      const pendingAuth = await this.dependencies.pendingStorage.read();
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      if (!pendingAuth) {
        // Tauri keeps the process launch URL available for the lifetime of the process. A WebView
        // reload can therefore replay an already consumed callback, which is safe to ignore when
        // no verifier-bound operation exists.
        return;
      }

      this.setState({ status: 'pending', intent: pendingAuth.intent });
      await this.exchangeCallback(callbackUrl, pendingAuth, operationGeneration);
    });
  }

  public dismissLinkConfirmation(): void {
    if (this.state.status === 'link-required') {
      this.setState({ status: 'idle' });
    }
  }

  public dismissFeedback(): void {
    if (this.state.status === 'feedback') {
      this.setState({ status: 'idle' });
    }
  }

  public reset(): Promise<void> {
    this.operationGeneration += 1;
    const resetGeneration = this.operationGeneration;
    this.stagedLinkUser = null;
    const resetOperation = this.dependencies.pendingStorage
      .clear()
      .finally(() => {
        if (this.isCurrentOperation(resetGeneration)) {
          this.setState({ status: 'idle' });
        }
      })
      .finally(() => {
        if (this.activeOperation === resetOperation) {
          this.activeOperation = null;
        }
      });
    this.activeOperation = resetOperation;
    return resetOperation;
  }

  private runExclusive(operation: (operationGeneration: number) => Promise<void>): Promise<void> {
    if (this.activeOperation) {
      return this.activeOperation;
    }

    const operationGeneration = this.operationGeneration;
    const activeOperation = operation(operationGeneration).finally(() => {
      if (this.activeOperation === activeOperation) {
        this.activeOperation = null;
      }
    });
    this.activeOperation = activeOperation;
    return activeOperation;
  }

  private runPreparedBrowserOperation(
    intent: PendingExternalAuth['intent'],
    operation: (operationGeneration: number) => Promise<void>,
  ): Promise<void> {
    try {
      // Web must reserve its popup synchronously while the user gesture is still active.
      this.dependencies.browser.prepareAuthorization();
    } catch (error: unknown) {
      return this.runExclusive(async (operationGeneration) => {
        await this.handleFlowError(intent, error, operationGeneration);
      });
    }

    return this.runExclusive(async (operationGeneration) => {
      try {
        await operation(operationGeneration);
      } finally {
        this.dependencies.browser.dismissPreparedAuthorization();
      }
    });
  }

  private async startAuthorization(
    intent: PendingExternalAuth['intent'],
    operationGeneration: number,
    currentPassword?: string,
  ): Promise<void> {
    try {
      const proof = await this.dependencies.createHandoffProof();
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      const startResponse =
        intent === 'sign-in'
          ? await this.dependencies.startSignIn({
              platform: this.dependencies.platform,
              handoffChallenge: proof.handoffChallenge,
            })
          : await this.dependencies.startLink({
              platform: this.dependencies.platform,
              handoffChallenge: proof.handoffChallenge,
              currentPassword: currentPassword ?? '',
            });
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      const pendingAuth: PendingExternalAuth = {
        intent,
        platform: this.dependencies.platform,
        transactionId: startResponse.transactionId,
        transactionExpiresAt: startResponse.transactionExpiresAt,
        handoffVerifier: proof.handoffVerifier,
      };
      await this.dependencies.pendingStorage.write(pendingAuth);
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }

      const browserResult = await this.dependencies.browser.openAuthorization(
        startResponse.authorizationUrl,
        this.dependencies.returnUri,
      );
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      if (browserResult.type === 'cancelled') {
        await this.dependencies.pendingStorage.clear();
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        this.setState(
          intent === 'link'
            ? {
                status: 'feedback',
                messageKey: 'google.feedback.linkCancelled',
                tone: 'neutral',
              }
            : { status: 'idle' },
        );
        if (intent === 'link' && this.activateStagedLinkAuthentication()) {
          this.dependencies.navigateToNotes();
        }
        return;
      }

      if (browserResult.type === 'callback') {
        await this.exchangeCallback(browserResult.callbackUrl, pendingAuth, operationGeneration);
      }
    } catch (error: unknown) {
      await this.handleFlowError(intent, error, operationGeneration);
    }
  }

  private async exchangeCallback(
    callbackUrl: string,
    pendingAuth: PendingExternalAuth,
    operationGeneration: number,
  ): Promise<void> {
    try {
      const handoffCode = readGoogleHandoffCode(
        callbackUrl,
        this.dependencies.returnUri,
        pendingAuth,
        this.dependencies.now(),
      );
      removeGoogleCallbackFromBrowserHistory(this.dependencies.returnUri);
      const exchangeRequest = {
        handoffCode,
        handoffVerifier: pendingAuth.handoffVerifier,
      };

      if (pendingAuth.intent === 'sign-in') {
        const session = await this.dependencies.exchangeSignIn(exchangeRequest);
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        await this.dependencies.completeAuthentication(session);
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        await this.dependencies.pendingStorage.clear();
        if (!this.isCurrentOperation(operationGeneration)) {
          return;
        }
        this.setState({ status: 'idle' });
        this.dependencies.navigateToNotes();
        return;
      }

      await this.dependencies.exchangeLink(exchangeRequest);
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      await this.dependencies.pendingStorage.clear();
      if (!this.isCurrentOperation(operationGeneration)) {
        return;
      }
      this.setState({
        status: 'feedback',
        messageKey: 'google.feedback.linked',
        tone: 'success',
      });
      this.activateStagedLinkAuthentication();
      this.dependencies.navigateToNotes();
    } catch (error: unknown) {
      await this.handleFlowError(pendingAuth.intent, error, operationGeneration);
    }
  }

  private async handleFlowError(
    intent: PendingExternalAuth['intent'],
    error: unknown,
    operationGeneration: number,
  ): Promise<void> {
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    await this.dependencies.pendingStorage.clear();
    if (!this.isCurrentOperation(operationGeneration)) {
      return;
    }
    const apiErrorCode = this.dependencies.getApiErrorCode(error);

    if (apiErrorCode === 'AUTH_GOOGLE_CANCELLED') {
      this.setState(
        intent === 'link'
          ? {
              status: 'feedback',
              messageKey: 'google.feedback.linkCancelled',
              tone: 'neutral',
            }
          : { status: 'idle' },
      );
      if (intent === 'link' && this.activateStagedLinkAuthentication()) {
        this.dependencies.navigateToNotes();
      }
      return;
    }

    if (apiErrorCode === 'AUTH_ACCOUNT_LINK_REQUIRED' && intent === 'sign-in') {
      this.setState({ status: 'link-required' });
      return;
    }

    const errorKey =
      error instanceof ExpiredGoogleAuthCallbackError
        ? 'errors.google.expiredHandoff'
        : error instanceof InvalidGoogleAuthCallbackError
          ? 'errors.google.invalidCallback'
          : this.dependencies.getErrorKey(error);

    this.setState({ status: 'feedback', messageKey: errorKey, tone: 'error' });
    if (intent === 'link' && this.activateStagedLinkAuthentication()) {
      this.dependencies.navigateToNotes();
    }
  }

  private activateStagedLinkAuthentication(): boolean {
    if (!this.stagedLinkUser) {
      return false;
    }

    const authenticatedUser = this.stagedLinkUser;
    this.stagedLinkUser = null;
    this.dependencies.activateAuthentication(authenticatedUser);
    return true;
  }

  private isCurrentOperation(operationGeneration: number): boolean {
    return operationGeneration === this.operationGeneration;
  }

  private setState(state: GoogleAuthState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
