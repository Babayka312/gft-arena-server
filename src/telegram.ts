export type TelegramWebAppUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramInitDataUnsafe = {
  user?: TelegramWebAppUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
  start_param?: string;
};

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  isExpanded?: boolean;
  version?: string;
  ready?: () => void;
  expand?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  close?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
  MainButton?: {
    isVisible: boolean;
    text: string;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged?: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramUserDisplayName(user?: TelegramWebAppUser): string | null {
  if (!user) return null;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username || null;
}

/**
 * Открывает внешнюю ссылку безопасным способом. В Telegram WebApp
 * `window.location.href = url` блокируется (особенно для `xumm://`
 * и `tg://`-схем), поэтому используем `Telegram.WebApp.openLink` /
 * `openTelegramLink` когда доступны, а в обычном браузере падаем
 * на `window.open(_, '_blank')`, чтобы текущая страница не закрылась
 * и фоновая пол-loop кошелька доработала.
 */
export function openExternalLink(url: string): void {
  if (!url) return;
  const tg = getTelegramWebApp();
  try {
    if (tg) {
      if (url.startsWith('tg://') || url.includes('t.me/')) {
        if (tg.openTelegramLink) {
          tg.openTelegramLink(url);
          return;
        }
      }
      if (tg.openLink) {
        tg.openLink(url, { try_instant_view: false });
        return;
      }
    }
  } catch {
    // ignore — fallback ниже
  }
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) return;
  } catch {
    // ignore
  }
  window.location.href = url;
}

