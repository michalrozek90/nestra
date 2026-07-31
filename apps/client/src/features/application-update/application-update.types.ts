export type ApplicationUpdateErrorCode =
  'check-failed' | 'download-failed' | 'local-save-failed' | 'install-failed' | 'restart-failed';

export type ApplicationUpdateState =
  | { readonly status: 'unsupported' }
  | { readonly status: 'idle' }
  | { readonly status: 'checking' }
  | { readonly status: 'up-to-date' }
  | {
      readonly status: 'available';
      readonly version: string;
      readonly notes?: string;
    }
  | {
      readonly status: 'downloading';
      readonly version: string;
      readonly downloadedBytes: number;
      readonly totalBytes?: number;
    }
  | { readonly status: 'installing'; readonly version: string }
  | { readonly status: 'restart-required'; readonly version: string }
  | {
      readonly status: 'recoverable-error';
      readonly code: ApplicationUpdateErrorCode;
      readonly version?: string;
    };

export type ApplicationUpdateDownloadProgress = {
  readonly downloadedBytes: number;
  readonly totalBytes?: number;
};

export interface ApplicationUpdateHandle {
  readonly version: string;
  readonly notes: string | undefined;
  download(onProgress: (progress: ApplicationUpdateDownloadProgress) => void): Promise<void>;
  install(): Promise<void>;
  close(): Promise<void>;
}

export interface ApplicationUpdatePlatform {
  readonly isSupported: boolean;
  check(): Promise<ApplicationUpdateHandle | null>;
  relaunch(): Promise<void>;
}
