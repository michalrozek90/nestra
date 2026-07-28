type TauriWindow = Window & {
  readonly __TAURI_INTERNALS__?: object;
  readonly __TAURI__?: object;
};

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const tauriWindow = window as TauriWindow;
  return tauriWindow.__TAURI_INTERNALS__ !== undefined || tauriWindow.__TAURI__ !== undefined;
}
