import { type ReactNode, useMemo } from 'react';
import { THEME, TonConnectUIProvider } from '@tonconnect/ui-react';

/**
 * Для dev на localhost: при необходимости задай VITE_TON_MANIFEST_URL на выложенный
 * `https://<домен>/tonconnect-manifest.json` с тем же `url` в JSON, что и у сайта.
 */
export function TonConnectProvider({ children }: { children: ReactNode }) {
  const manifestUrl = useMemo(() => {
    const fromEnv = import.meta.env.VITE_TON_MANIFEST_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
      return fromEnv.trim();
    }
    if (typeof window === 'undefined') {
      return 'https://gftarenatest.cc/tonconnect-manifest.json';
    }
    return `${window.location.origin}/tonconnect-manifest.json`;
  }, []);

  return (
    <TonConnectUIProvider language="ru" uiPreferences={{ theme: THEME.DARK }} manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
