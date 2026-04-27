import { API_BASE } from './apiConfig';

export type PlayerRegisterResponse = {
  id: number;
};

export async function registerPlayer(identityKey: string): Promise<PlayerRegisterResponse> {
  const r = await fetch(`${API_BASE}/api/player/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identityKey }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
