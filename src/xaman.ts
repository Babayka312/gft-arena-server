import { API_BASE } from './apiConfig';

export type XamanSignInResponse = {
  uuid: string;
  next?: {
    always?: string; // deep link / URL
  };
  refs?: {
    qr_png?: string;
    qr_matrix?: string;
  };
  pushed?: boolean;
};

export type XamanPayload = {
  meta?: {
    uuid?: string;
    exists?: boolean;
    expired?: boolean;
    resolved?: boolean;
    signed?: boolean;
    cancelled?: boolean;
  };
  response?: {
    account?: string;
  };
};

export async function xamanCreateSignIn(): Promise<XamanSignInResponse> {
  const r = await fetch(`${API_BASE}/api/xaman/signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function xamanGetPayload(uuid: string): Promise<XamanPayload> {
  const r = await fetch(`${API_BASE}/api/xaman/payload/${encodeURIComponent(uuid)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type GftDepositCreateResponse = XamanSignInResponse;

export type GftDepositVerifyResponse =
  | { status: 'pending' | 'submitted' | 'cancelled' | 'expired' | 'not_signed' }
  | { status: 'invalid'; reason: string; txid?: string; account?: string }
  | {
      status: 'credited' | 'already_credited';
      account?: string;
      txid: string;
      amount: string;
      currency: string;
      issuer: string;
      progress?: unknown;
      updatedAt?: string;
    };

export async function gftCreateDeposit(
  amount: string,
  account: string,
  playerId?: string,
): Promise<GftDepositCreateResponse> {
  const r = await fetch(`${API_BASE}/api/gft/deposit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount, account, playerId: playerId ?? '' }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function gftVerifyDeposit(
  uuid: string,
  playerId?: string,
): Promise<GftDepositVerifyResponse> {
  const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  const r = await fetch(
    `${API_BASE}/api/gft/deposit/${encodeURIComponent(uuid)}/verify${qs}`,
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type GftWithdrawStatus = 'queued' | 'signing' | 'paid' | 'rejected' | 'failed';

export type GftWithdrawEntry = {
  id: string;
  amount: string;
  requestedAmount?: string;
  feePct?: number | null;
  feeAmount?: string | null;
  destination: string;
  status: GftWithdrawStatus;
  createdAt: string;
  updatedAt: string;
  txid: string | null;
  rejectedReason: string | null;
};

export type GftWithdrawCreateResponse = {
  ok: true;
  withdraw: GftWithdrawEntry;
  rules?: {
    minAmount: number;
    maxAmount: number;
    feePctRange: { min: number; max: number };
    cooldownDays: number;
    minAccountAgeDays: number;
    requirements: { kycVerified: boolean; minHeroLevel: number; minTotalBattles: number };
    feePct: number;
  };
  effectiveFeePct?: number;
  progress: unknown;
  updatedAt: string;
};

export async function gftCreateWithdraw(
  playerId: string,
  amount: number,
  destination: string,
): Promise<GftWithdrawCreateResponse> {
  const r = await fetch(`${API_BASE}/api/gft/withdraw/${encodeURIComponent(playerId)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount, destination }),
  });
  if (!r.ok) {
    let msg = await r.text();
    try {
      const j = JSON.parse(msg);
      if (j?.error) msg = j.error;
    } catch {
      // raw text already in msg
    }
    throw new Error(msg);
  }
  return r.json();
}

export async function gftListWithdraws(playerId: string): Promise<GftWithdrawEntry[]> {
  const r = await fetch(`${API_BASE}/api/gft/withdraw/${encodeURIComponent(playerId)}`);
  if (!r.ok) throw new Error(await r.text());
  const j = (await r.json()) as { withdraws?: GftWithdrawEntry[] };
  return Array.isArray(j.withdraws) ? j.withdraws : [];
}

export type GftWithdrawRulesResponse = {
  ok: true;
  rules: {
    minAmount: number;
    maxAmount: number;
    feePctRange: { min: number; max: number };
    cooldownDays: number;
    minAccountAgeDays: number;
    requirements: { kycVerified: boolean; minHeroLevel: number; minTotalBattles: number };
    feePct: number;
  };
  checks: {
    kycVerified: boolean;
    heroLevel: number;
    totalBattles: number;
    accountAgeDays: number;
  };
  nextAvailableAt: string | null;
  eligible: boolean;
  reasons: string[];
};

export async function gftGetWithdrawRules(playerId: string): Promise<GftWithdrawRulesResponse> {
  const r = await fetch(`${API_BASE}/api/gft/withdrawRules/${encodeURIComponent(playerId)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export type GftStakeTier = {
  id: string;
  minStake: number;
  farmBonusPct: number;
  rareDropBonusPct: number;
  pvpBonusPct: number;
  exclusiveRewards: boolean;
};

export type GftStakeEntry = {
  id: string;
  amount: number;
  tierId: string;
  startedAt: string;
  unlockAt: number;
  timeLeftMs?: number;
  canUnstake?: boolean;
};

export type GftStakingInfoResponse = {
  ok: true;
  staking: {
    totalStaked: number;
    stakes: GftStakeEntry[];
    currentTier: GftStakeTier | null;
    bonus: {
      farmBonusPct: number;
      rareDropBonusPct: number;
      pvpBonusPct: number;
      exclusiveRewards: boolean;
    };
    lockDays: number;
  };
  tiers: GftStakeTier[];
  balance: number;
};

export async function gftGetStakingInfo(playerId: string): Promise<GftStakingInfoResponse> {
  const r = await fetch(`${API_BASE}/api/gft/stakingInfo/${encodeURIComponent(playerId)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function gftStake(playerId: string, amount: number): Promise<{ ok: true; [k: string]: unknown }> {
  const r = await fetch(`${API_BASE}/api/gft/stake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId, amount }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function gftUnstake(playerId: string, stakeId?: string): Promise<{ ok: true; [k: string]: unknown }> {
  const r = await fetch(`${API_BASE}/api/gft/unstake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId, stakeId: stakeId ?? null }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

