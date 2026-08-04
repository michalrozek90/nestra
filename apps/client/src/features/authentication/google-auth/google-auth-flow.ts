import type {
  AuthenticationSessionResponse,
  ExternalIdentityResponse,
  GoogleAuthExchangeRequest,
  GoogleAuthPlatform,
  GoogleAuthStartRequest,
  GoogleAuthStartResponse,
  GoogleLinkStartRequest,
  LoginRequest,
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

  public constructor(private readonly dependencies: GoogleAuthFlowDependencies) {}

  public readonly subscribe = (listener: StateListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public readonly getSnapshot = (): GoogleAuthState => this.state;

  public startSignIn(): Promise<void> {
    if (this.state.status === 'pending') {
      return this.activeOperation ?? Promise.resolve();
    }

    return this.runExclusive(async () => {
      this.setState({ status: 'pending', intent: 'sign-in' });
      await this.startAuthorization('sign-in');
    });
  }

  public confirmLink(request: LoginRequest): Promise<void> {
    if (this.state.status === 'pending') {
      return this.activeOperation ?? Promise.resolve();
    }

    return this.runExclusive(async () => {
      this.setState({ status: 'pending', intent: 'link' });
      try {
        const passwordSession = await this.dependencies.login(request);
        await this.dependencies.completeAuthentication(passwordSession);
        this.dependencies.navigateToNotes();
      } catch (error: unknown) {
        this.setState({ status: 'link-required', errorKey: this.dependencies.getErrorKey(error) });
        return;
      }

      await this.startAuthorization('link', request.password);
    });
  }

  public resumeCallback(callbackUrl: string): Promise<void> {
    if (!isGoogleAuthCallbackUrl(callbackUrl, this.dependencies.returnUri)) {
      return Promise.resolve();
    }

    if (this.activeOperation) {
      return this.activeOperation;
    }

    return this.runExclusive(async () => {
      const pendingAuth = await this.dependencies.pendingStorage.read();
      if (!pendingAuth) {
        this.setState({
          status: 'feedback',
          messageKey: 'errors.google.invalidCallback',
          tone: 'error',
        });
        return;
      }

      this.setState({ status: 'pending', intent: pendingAuth.intent });
      await this.exchangeCallback(callbackUrl, pendingAuth);
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

  private runExclusive(operation: () => Promise<void>): Promise<void> {
    if (this.activeOperation) {
      return this.activeOperation;
    }

    const activeOperation = operation().finally(() => {
      if (this.activeOperation === activeOperation) {
        this.activeOperation = null;
      }
    });
    this.activeOperation = activeOperation;
    return activeOperation;
  }

  private async startAuthorization(
    intent: PendingExternalAuth['intent'],
    currentPassword?: string,
  ): Promise<void> {
    try {
      const proof = await this.dependencies.createHandoffProof();
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
      const pendingAuth: PendingExternalAuth = {
        intent,
        platform: this.dependencies.platform,
        transactionId: startResponse.transactionId,
        transactionExpiresAt: startResponse.transactionExpiresAt,
        handoffVerifier: proof.handoffVerifier,
      };
      await this.dependencies.pendingStorage.write(pendingAuth);

      const browserResult = await this.dependencies.browser.openAuthorization(
        startResponse.authorizationUrl,
        this.dependencies.returnUri,
      );
      if (browserResult.type === 'cancelled') {
        await this.dependencies.pendingStorage.clear();
        this.setState(
          intent === 'link'
            ? {
                status: 'feedback',
                messageKey: 'google.feedback.linkCancelled',
                tone: 'neutral',
              }
            : { status: 'idle' },
        );
        return;
      }

      if (browserResult.type === 'callback') {
        await this.exchangeCallback(browserResult.callbackUrl, pendingAuth);
      }
    } catch (error: unknown) {
      await this.handleFlowError(intent, error);
    }
  }

  private async exchangeCallback(
    callbackUrl: string,
    pendingAuth: PendingExternalAuth,
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
        await this.dependencies.completeAuthentication(session);
        await this.dependencies.pendingStorage.clear();
        this.setState({ status: 'idle' });
        this.dependencies.navigateToNotes();
        return;
      }

      await this.dependencies.exchangeLink(exchangeRequest);
      await this.dependencies.pendingStorage.clear();
      this.setState({
        status: 'feedback',
        messageKey: 'google.feedback.linked',
        tone: 'success',
      });
      this.dependencies.navigateToNotes();
    } catch (error: unknown) {
      await this.handleFlowError(pendingAuth.intent, error);
    }
  }

  private async handleFlowError(
    intent: PendingExternalAuth['intent'],
    error: unknown,
  ): Promise<void> {
    await this.dependencies.pendingStorage.clear();
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
  }

  private setState(state: GoogleAuthState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
