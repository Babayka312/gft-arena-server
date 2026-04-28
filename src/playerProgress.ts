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
  rngSeed?: string;
  pvpOpponentPlayerId?: string;
  pvpOpponentRating?: number;
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
  /** Знак зодиака (сервер: строка из прогресса или выведен из id героя) */
  zodiac?: string;
  /** id шаблона главного героя 1–12, если сервер прислал */
  mainHeroId?: number;
};

export type PvpMatchmakingMeta = {
  listSize: number;
  pools: { near: number; mid: number; far: number };
  quotas: { near: number; mid: number; far: number };
};

export async function fetchPvpOpponents(
  playerId: string,
  options?: { limit?: number; vary?: string | number },
): Promise<{
  ok: true;
  myRating: number;
  count: number;
  opponents: PvpOpponentInfo[];
  matchmaking?: PvpMatchmakingMeta;
}> {
  const qs = new URLSearchParams({ playerId });
  if (options?.limit != null && Number.isFinite(Number(options.limit))) {
    qs.set('limit', String(Math.floor(Number(options.limit))));
  }
  if (options?.vary != null && String(options.vary) !== '') {
    qs.set('vary', String(options.vary));
  }
  const r = await fetch(`${API_BASE}/api/arena/pvp-opponents?${qs.toString()}`);
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

const PENDING_PROGRESS_KEY_PREFIX = 'gft_pending_progress_v1:';

async function putPlayerProgressBody(
  playerId: string,
  progress: unknown,
): Promise<{ ok: true; updatedAt: string }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/progress`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ progress }),
  });
  const text = await r.text();
  if (!r.ok) {
    const err = new Error(text || `HTTP ${r.status}`) as Error & { status: number };
    err.status = r.status;
    throw err;
  }
  return JSON.parse(text) as { ok: true; updatedAt: string };
}

function isRetriableProgressSaveError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  const st = (e as { status?: number }).status;
  if (typeof st === 'number' && st >= 400 && st < 500) return false;
  return true;
}

export async function savePlayerProgress(playerId: string, progress: unknown): Promise<{ ok: true; updatedAt: string }> {
  return putPlayerProgressBody(playerId, progress);
}

/**
 * Повторы с backoff при 5xx/сети; 4xx не дублируем.
 * При окончательной ошибке — бэкап в localStorage для flushPendingProgressSave.
 */
export async function savePlayerProgressResilient(
  playerId: string,
  progress: unknown,
): Promise<{ ok: true; updatedAt: string }> {
  const key = `${PENDING_PROGRESS_KEY_PREFIX}${playerId}`;
  const maxAttempts = 4;
  const baseMs = 450;
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const data = await putPlayerProgressBody(playerId, progress);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return data;
    } catch (e) {
      lastErr = e;
      if (!isRetriableProgressSaveError(e)) break;
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
      }
    }
  }
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), progress }));
  } catch {
    /* quota */
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** После загрузки с сервера — догрузить отложенный сейв, если остался после сбоя сети. */
export async function flushPendingProgressSave(playerId: string): Promise<void> {
  const key = `${PENDING_PROGRESS_KEY_PREFIX}${playerId}`;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return;
  }
  if (raw == null) return;
  let parsed: { progress?: unknown };
  try {
    parsed = JSON.parse(raw) as { progress?: unknown };
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  if (parsed == null || parsed.progress == null || typeof parsed.progress !== 'object') {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await savePlayerProgressResilient(playerId, parsed.progress);
  } catch {
    /* оставляем pending */
  }
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

export type PvpMoveLogEntry = {
  side: 'player' | 'bot';
  ability: 'basic' | 'skill';
  attackerUid: string;
  targetUid: string | null;
  allyUid: string | null;
};

export async function claimPlayerBattleReward(
  playerId: string,
  payload: {
    sessionId: string;
    mode: 'pvp' | 'pve';
    result: 'win' | 'lose';
    account: string | null;
    pveContext?: { chapter: number; level: number; isBoss: boolean; isTraining?: boolean };
    materialFind?: number;
    pvpMoves?: PvpMoveLogEntry[];
  },
): Promise<{
    ok: true;
    rewardModal: ServerBattleRewardModal;
    progress: unknown;
    updatedAt: string;
    /** PvP: исход и награды посчитаны по серверному пересчёту журналов */
    pvpServerRecalc?: boolean;
    pvpServerResult?: 'win' | 'lose';
    clientDeclaredResult?: 'win' | 'lose';
    pvpResultMatch?: boolean;
    pvpReplayStats?: { movesApplied: number; endedAtMoveIndex: number; roundAtEnd: number };
  }> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/battle/reward`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  if (!r.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (typeof j.error === 'string' && j.error) detail = j.error;
    } catch {
      /* raw text */
    }
    throw new Error(detail.slice(0, 400));
  }
  return JSON.parse(text) as {
    ok: true;
    rewardModal: ServerBattleRewardModal;
    progress: unknown;
    updatedAt: string;
    pvpServerRecalc?: boolean;
    pvpServerResult?: 'win' | 'lose';
    clientDeclaredResult?: 'win' | 'lose';
    pvpResultMatch?: boolean;
    pvpReplayStats?: { movesApplied: number; endedAtMoveIndex: number; roundAtEnd: number };
  };
}

export type BattleSessionStartEnergy = {
  current: number;
  regenAt: number;
  cost: number;
};

export async function startPlayerBattleSession(
  playerId: string,
  payload: {
    mode: 'pvp' | 'pve';
    opponent: { id: number; name: string };
    pveContext?: { chapter: number; level: number; isBoss: boolean; isTraining?: boolean };
    opponentPlayerId?: string;
  },
): Promise<{
  ok: true;
  session: ServerBattleSession;
  energy: BattleSessionStartEnergy;
}> {
  const r = await fetch(`${API_BASE}/api/player/${encodeURIComponent(playerId)}/battle/session/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let data: { error?: string; session?: ServerBattleSession; energy?: BattleSessionStartEnergy; ok?: boolean };
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    data = {};
  }
  if (!r.ok) {
    const err = new Error(data.error || text || `HTTP ${r.status}`) as Error & { status: number; body: unknown };
    err.status = r.status;
    err.body = data;
    throw err;
  }
  if (!data.session || !data.energy) {
    throw new Error('Invalid battle session response');
  }
  return { ok: true, session: data.session, energy: data.energy };
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
