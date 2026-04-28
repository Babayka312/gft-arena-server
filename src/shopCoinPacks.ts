import { API_BASE } from './apiConfig';

export type ShopTonEffect =
  | { type: 'coins'; amount: number }
  | { type: 'crystals'; amount: number }
  | { type: 'cardPack'; packType: 'basic' | 'premium' | 'mythic' }
  | { type: 'battlepass' };

export type ShopTonOfferClient = {
  id: string;
  label: string;
  ton: number;
  kind: 'coins' | 'crystals' | 'pack' | 'battlepass' | 'other';
  effect: ShopTonEffect;
};

export type ShopCoinPacksResponse = {
  ok: true;
  xrp: Array<{ id: string; label: string; xrp: number; coins: number }>;
  ton: ShopTonOfferClient[];
  tonEnabled: boolean;
};

export type TonPurchaseGrant =
  | { type: 'coins'; amount: number }
  | { type: 'crystals'; amount: number }
  | { type: 'pack'; packType: string; packName: string; results: Array<{ cardId: string; name: string; rarity: string; isDuplicate: boolean; shards: number }> }
  | { type: 'battlepass' };

export async function fetchShopCoinPacks(): Promise<ShopCoinPacksResponse> {
  const r = await fetch(`${API_BASE}/api/shop/coin-packs`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createXrpCoinPurchase(playerId: string, packId: string) {
  const r = await fetch(`${API_BASE}/api/shop/coins/purchase-xrp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId, packId }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    uuid: string;
    next?: { always?: string };
    drops: number;
    coins: number;
  }>;
}

export type VerifyXrpCoinResponse =
  | {
      status: 'pending' | 'cancelled' | 'expired' | 'not_signed' | 'submitted' | 'invalid' | 'already_credited';
      reason?: string;
      txid?: string;
      txType?: string;
      dest?: string;
      expectedDest?: string;
      amount?: string;
      expectedDrops?: string;
    }
  | { status: 'credited'; coins: number; txid: string; progress: unknown; updatedAt: string };

export async function verifyXrpCoinPurchase(playerId: string, uuid: string): Promise<VerifyXrpCoinResponse> {
  const r = await fetch(
    `${API_BASE}/api/shop/coins/purchase-xrp/${encodeURIComponent(uuid)}/verify?playerId=${encodeURIComponent(playerId)}`,
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getTonShopTransaction(playerId: string, packId: string) {
  const r = await fetch(`${API_BASE}/api/shop/coins/ton/transaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId, packId }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    ok: true;
    validUntil: number;
    messages: Array<{ address: string; amount: string }>;
    packId: string;
    effect: ShopTonEffect;
  }>;
}

export type VerifyTonShopResponse = { status: 'already_credited' } | { status: 'credited'; progress: unknown; updatedAt: string; grant: TonPurchaseGrant };

export async function verifyTonShopPurchase(playerId: string, boc: string): Promise<VerifyTonShopResponse> {
  const r = await fetch(`${API_BASE}/api/shop/coins/ton/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId, boc }),
  });
  if (!r.ok) {
    const t = await r.text();
    let msg = t;
    try {
      const j = JSON.parse(t) as { error?: string };
      if (typeof j.error === 'string' && j.error) msg = j.error;
    } catch {
      // not JSON
    }
    throw new Error(msg);
  }
  return r.json();
}
