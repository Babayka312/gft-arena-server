import { memo, useMemo, useState, type CSSProperties } from 'react';
import { API_BASE } from '../../apiConfig';
import { Background } from '../../components/ui/Background';

type AdminLoginProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
  onAuthenticated: () => void;
};

function getTelegramInitData(): string {
  try {
    const tg = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
    return String(tg?.initData || '');
  } catch {
    return '';
  }
}

export const AdminLogin = memo(function AdminLogin({
  background,
  contentInset,
  bottomInsetPx,
  onAuthenticated,
}: AdminLoginProps) {
  const tgInit = useMemo(() => getTelegramInitData(), []);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [error, setError] = useState('');

  const headers = {
    'content-type': 'application/json',
    ...(tgInit ? { 'x-telegram-init-data': tgInit } : {}),
  };

  async function loginWithPassword() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ password, telegramInitData: tgInit }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setNeed2fa(Boolean(j?.requires2fa));
      if (!j?.requires2fa) onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function setup2fa() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/admin/auth/2fa/setup`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ telegramInitData: tgInit }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setSetupSecret(String(j?.secret || ''));
      setSetupUri(String(j?.otpauthUrl || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : '2FA setup failed');
    } finally {
      setBusy(false);
    }
  }

  async function verify2fa() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`${API_BASE}/api/admin/auth/2fa/verify`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ code, telegramInitData: tgInit }),
      });
      if (!r.ok) throw new Error(await r.text());
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : '2FA verify failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(2,6,23,0.92), rgba(15,23,42,0.88))"
      style={{
        ...contentInset,
        paddingBottom: `${bottomInsetPx}px`,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 12px' }}>
        <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 900 }}>
          Admin Login
        </h2>
        <div style={{ borderRadius: '14px', border: '1px solid rgba(71,85,105,0.65)', background: 'rgba(15,23,42,0.86)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', padding: '12px', display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#93c5fd' }}>
            Telegram WebApp: {tgInit ? 'verified source available' : 'missing initData (open via Telegram)'}
          </div>
          {!need2fa && (
            <>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                style={{ borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '10px 12px', fontSize: '14px' }}
              />
              <button
                type="button"
                onClick={() => void loginWithPassword()}
                disabled={busy || !tgInit}
                style={{ borderRadius: '10px', border: 'none', background: busy ? '#475569' : '#22c55e', color: '#052e16', fontWeight: 900, padding: '10px 12px', cursor: busy ? 'wait' : 'pointer' }}
              >
                {busy ? '...' : 'Continue'}
              </button>
            </>
          )}

          {need2fa && (
            <>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>2FA code (Google Authenticator)</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => void setup2fa()}
                  disabled={busy}
                  style={{ borderRadius: '10px', border: '1px solid #334155', background: '#0b1220', color: '#cbd5e1', fontWeight: 700, padding: '10px 12px', cursor: busy ? 'wait' : 'pointer' }}
                >
                  Setup 2FA
                </button>
              </div>
              {setupSecret && (
                <div style={{ borderRadius: '10px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(2,6,23,0.7)', padding: '8px', fontSize: '12px', color: '#e2e8f0' }}>
                  <div>Secret: <span style={{ fontFamily: 'monospace' }}>{setupSecret}</span></div>
                  {setupUri && <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all' }}>{setupUri}</div>}
                </div>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                style={{ borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#fff', padding: '10px 12px', fontSize: '14px', letterSpacing: '0.2em' }}
              />
              <button
                type="button"
                onClick={() => void verify2fa()}
                disabled={busy || code.length !== 6}
                style={{ borderRadius: '10px', border: 'none', background: busy ? '#475569' : '#38bdf8', color: '#082f49', fontWeight: 900, padding: '10px 12px', cursor: busy ? 'wait' : 'pointer' }}
              >
                {busy ? '...' : 'Verify 2FA'}
              </button>
            </>
          )}

          {error && (
            <div style={{ borderRadius: '10px', border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', fontSize: '12px', fontWeight: 700, padding: '8px 10px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </Background>
  );
});

