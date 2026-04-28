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
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
