export type WhatsNewDialogAction = 'acknowledge' | 'view-history';

export function shouldPersistSeenReleaseNotes(action: WhatsNewDialogAction): boolean {
  switch (action) {
    case 'acknowledge':
      return true;
    case 'view-history':
      return false;
  }
}

export function isWhatsNewHistoryPath(pathname: string): boolean {
  return pathname === '/settings/whats-new' || pathname.endsWith('/settings/whats-new');
}
