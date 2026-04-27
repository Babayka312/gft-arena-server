import { API_BASE } from './apiConfig';

export type PlayerProgressResponse = {
  progress: unknown | null;
  updatedAt: string | null;
};

export type ClientProgressNotice = { id: string; at: string; message: string };

export type ServerDailyReward = {
  tier: string;
  description: string;
  coins: number;
  crystals: number;
  materials: number;
  shards: number;
  gft: number;
};

export type ServerHoldState = {
  endTime: number | null;
  lockedGft: number;
  earnings: number;
  rewardRate?: number;
};

export type ServerBattleRewardModal = {
  result: 'win' | 'lose';
  title: string;
  subtitle: string;
  rewards: string[];
};

export type ServerCardPackResult = {
  packName: string;
  results: Array<{
    cardId: string;
    name: string;
    rarity: string;
    isDuplicate: boolean;
    shards: number;
  }>;
};

export type ServerBattleSession = {
  id: string;
  playerId: string;
  mode: 'pvp' | 'pve';
  pveContext: { chapter: number; level: number; isBoss: boolean } | null;
  createdAt: number;
  expiresAt: number;
  claimed: boolean;
};

export async function ackPlayerClientNotices(
  playerId: string,
  ids: string[],
): Promise<{ ok: true; updatedAt: string }> {
  const r = await fetch(
    `${API_BASE}/api/player/${encodeURIComponent(playerId)}/client-notices/ack`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type PvpOpponentInfo = {
  playerId: string;
  name: string;
  rating: number;
  power: number;
  maxHP: number;
};

export async function fetchPvpOpponents(playerId: string): Promise<{
  ok: true;
  myRating: number;
  count: number;
  opponents: PvpOpponentInfo[];
}> {
  const r = await fetch(
    `${API_BASE}/api/arena/pvp-opponents?playerId=${encodeURIComponent(playerId)}`,
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function loadPlayerProgress(
  playerId: string,
  options?: { timeoutMs?: number },
): Promise<PlayerProgressResponse> {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const ctrl = new AbortController();
  const tid = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/progress`, {
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  } finally {
    window.clearTimeout(tid);
  }
}

export async function savePlayerProgress(playerId: string, progress: unknown): Promise<{ ok: true; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/progress`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ progress }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function claimPlayerDailyReward(playerId: string, account: string | null): Promise<{ ok: true; reward: ServerDailyReward; progress: unknown; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/daily-reward/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function startPlayerHold(playerId: string, amount: number, account: string | null): Promise<{ ok: true; hold: ServerHoldState; progress: unknown; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/hold/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount, account }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function claimPlayerHold(playerId: string): Promise<{ ok: true; reward: { lockedGft: number; rewardGft: number; totalGft: number }; hold: ServerHoldState; progress: unknown; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/hold/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function claimPlayerBattleReward(
  playerId: string,
  payload: {
    sessionId: string;
    mode: 'pvp' | 'pve';
    result: 'win' | 'lose';
    account: string | null;
    pveContext?: { chapter: number; level: number; isBoss: boolean; isTraining?: boolean };
    materialFind?: number;
  },
): Promise<{ ok: true; rewardModal: ServerBattleRewardModal; progress: unknown; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/battle/reward`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function startPlayerBattleSession(
  playerId: string,
  payload: {
    mode: 'pvp' | 'pve';
    opponent: { id: number; name: string };
    pveContext?: { chapter: number; level: number; isBoss: boolean; isTraining?: boolean };
  },
): Promise<{ ok: true; session: ServerBattleSession }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/battle/session/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function openPlayerCardPack(
  playerId: string,
  packType: string,
  payment: 'default' | 'gft',
): Promise<{ ok: true; pack: ServerCardPackResult; progress: unknown; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/card-pack/open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packType, payment }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sendPlayerPresenceHeartbeat(
  playerId: string,
  payload: { userName?: string; label?: string },
): Promise<{ ok: true }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/presence/heartbeat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
