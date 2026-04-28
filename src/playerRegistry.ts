import { API_BASE } from './apiConfig';

export type PlayerRegisterResponse = {
  id: number;
  telegramUserId?: string;
  recoveredFromTelegram?: boolean;
};

export async function registerPlayer(
  identityKey: string,
  telegramInitData?: string,
): Promise<PlayerRegisterResponse> {
  const r = await fetch(`${API_BASE}/api/player/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      identityKey,
      ...(telegramInitData ? { telegramInitData } : {}),
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    let serverError = '';
    try {
      const payload = JSON.parse(text) as { error?: unknown };
      serverError = typeof payload.error === 'string' ? payload.error.trim() : '';
    } catch {
      serverError = '';
    }
    throw new Error(serverError || text || `Player registration failed (${r.status})`);
  }
  return r.json();
}
