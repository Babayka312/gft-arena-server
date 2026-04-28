import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Address, Cell, loadMessage } from '@ton/core';

/** Паки: XRP (дропы) — только игровые монеты. GFT с XRPL — отдельно через /api/gft/deposit. */
export const SHOP_COIN_XRP_PACKS = {
  xrp025: { label: '0.000001 XRP', xrp: 0.000001, drops: 1, coins: 5_000 },
  xrp1: { label: '0.000002 XRP', xrp: 0.000002, drops: 2, coins: 25_000 },
  xrp5: { label: '0.000003 XRP', xrp: 0.000003, drops: 3, coins: 150_000 },
};

/**
 * TON-оферы: у каждого уникальные nanos. Не включает GFT — за TON купить GFT нельзя.
 * effect: coins | crystals | cardPack | battlepass
 */
export const SHOP_TON_OFFERS = {
  ton_c_01: { label: '0.000000001 TON', nanos: 1n, effect: { type: 'coins', amount: 4_000 } },
  ton_c_05: { label: '0.000000002 TON', nanos: 2n, effect: { type: 'coins', amount: 25_000 } },
  ton_c_1: { label: '0.000000003 TON', nanos: 3n, effect: { type: 'coins', amount: 60_000 } },
  ton_x_02: { label: '0.000000004 TON', nanos: 4n, effect: { type: 'crystals', amount: 2_000 } },
  ton_x_09: { label: '0.000000005 TON', nanos: 5n, effect: { type: 'crystals', amount: 10_000 } },
  ton_p_basic: { label: 'Обычный набор (0.000000006 TON)', nanos: 6n, effect: { type: 'cardPack', packType: 'basic' } },
  ton_p_prem: { label: 'Премиум набор (0.000000007 TON)', nanos: 7n, effect: { type: 'cardPack', packType: 'premium' } },
  ton_p_myth: { label: 'Мифический набор (0.000000008 TON)', nanos: 8n, effect: { type: 'cardPack', packType: 'mythic' } },
  ton_bp: { label: 'Battle Pass — премиум (0.000000009 TON)', nanos: 9n, effect: { type: 'battlepass' } },
};

export const COIN_XRP_PENDING_FILE = 'coin-purchase-xrp-pending.json';
export const COIN_CREDITED_FILE = 'coin-purchases-credited.json';

function effectKindForClient(effect) {
  if (effect.type === 'coins') return 'coins';
  if (effect.type === 'crystals') return 'crystals';
  if (effect.type === 'cardPack') return 'pack';
  if (effect.type === 'battlepass') return 'battlepass';
  return 'other';
}

export function getShopCoinPacksForClient() {
  return {
    xrp: Object.entries(SHOP_COIN_XRP_PACKS).map(([id, p]) => ({
      id,
      label: p.label,
      xrp: p.xrp,
      coins: p.coins,
    })),
    ton: Object.entries(SHOP_TON_OFFERS).map(([id, p]) => ({
      id,
      label: p.label,
      ton: Number(p.nanos) / 1e9,
      kind: effectKindForClient(p.effect),
      effect: p.effect,
    })),
  };
}

export function getXrpPackOrNull(packId) {
  return SHOP_COIN_XRP_PACKS[packId] ?? null;
}

/** Пак по сумме в drops (как в теле Payment на XRPL). */
export function getXrpPackByDropsOrNull(dropsRaw) {
  let n;
  try {
    n = typeof dropsRaw === 'bigint' ? dropsRaw : BigInt(String(Math.floor(Number(dropsRaw))));
  } catch {
    return null;
  }
  for (const [id, p] of Object.entries(SHOP_COIN_XRP_PACKS)) {
    if (BigInt(p.drops) === n) return { id, ...p };
  }
  return null;
}

export function getTonOfferOrNull(offerId) {
  return SHOP_TON_OFFERS[offerId] ?? null;
}

export function getTonOfferByReceivedNanos(nano) {
  let n;
  try {
    n = typeof nano === 'bigint' ? nano : BigInt(String(String(nano).replace(/\s/g, '')));
  } catch {
    return null;
  }
  for (const [id, p] of Object.entries(SHOP_TON_OFFERS)) {
    if (p.nanos === n) return { id, ...p };
  }
  return null;
}

function* walkCells(c) {
  yield c;
  for (const r of c.refs) yield* walkCells(r);
}

function* cellsFromBocBase64(b64) {
  const buf = Buffer.from(b64, 'base64');
  for (const root of Cell.fromBoc(buf)) {
    yield* walkCells(root);
  }
}

export function findInternalNanoToAddress(bocBase64, treasuryUserFriendly) {
  const treasury = Address.parse(treasuryUserFriendly.trim());
  for (const cell of cellsFromBocBase64(bocBase64)) {
    const s = cell.beginParse();
    if (s.remainingBits < 2) continue;
    let msg;
    try {
      msg = loadMessage(s);
    } catch {
      continue;
    }
    if (msg.info.type === 'internal' && msg.info.dest.equals(treasury)) {
      return msg.info.value.coins;
    }
  }
  return null;
}

export function bocHashId(bocBase64) {
  return createHash('sha256').update(bocBase64, 'utf8').digest('hex');
}

export function bocRootMessageHashBase64(bocBase64) {
  const buf = Buffer.from(bocBase64, 'base64');
  const roots = Cell.fromBoc(buf);
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error('Empty BOC');
  }
  return roots[0].hash().toString('base64');
}

function normalizeTonApiBase(baseUrl) {
  const fallback = 'https://toncenter.com/api/v3';
  const raw = (baseUrl || fallback).trim();
  const noSlash = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return noSlash;
}

function collectTransactionsFromTonApiResponse(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const root = /** @type {any} */ (payload);
  if (Array.isArray(root)) return root;
  if (Array.isArray(root.transactions)) return root.transactions;
  if (Array.isArray(root.result)) return root.result;
  if (root.result && typeof root.result === 'object') {
    if (Array.isArray(root.result.transactions)) return root.result.transactions;
    if (Array.isArray(root.result.items)) return root.result.items;
  }
  if (Array.isArray(root.items)) return root.items;
  return [];
}

function parseAddressSafe(addressLike) {
  if (typeof addressLike !== 'string' || !addressLike.trim()) return null;
  try {
    return Address.parse(addressLike.trim());
  } catch {
    return null;
  }
}

function sameAddress(left, right) {
  const a = parseAddressSafe(left);
  const b = parseAddressSafe(right);
  if (!a || !b) return false;
  return a.equals(b);
}

function parseCoinsSafe(value) {
  try {
    return BigInt(String(value).trim());
  } catch {
    return null;
  }
}

function toBase64Std(input) {
  if (typeof input !== 'string') return '';
  let normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) normalized += '=';
  return normalized;
}

function sameMessageHash(a, b) {
  const left = toBase64Std(a);
  const right = toBase64Std(b);
  return Boolean(left && right && left === right);
}

function findIncomingToTreasury(transactions, { treasuryAddress, expectedNanos, messageHashBase64 }) {
  for (const tx of transactions) {
    if (!tx || typeof tx !== 'object') continue;
    const inMsg = tx.in_msg;
    if (!inMsg || typeof inMsg !== 'object') continue;
    if (!sameAddress(inMsg.destination, treasuryAddress)) continue;
    const value = parseCoinsSafe(inMsg.value);
    if (value == null || value !== expectedNanos) continue;
    if (!sameMessageHash(inMsg.hash, messageHashBase64)) continue;
    return tx;
  }
  return null;
}

async function fetchJsonWithTimeout(url, headers = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // keep null
    }
    if (!response.ok) {
      const detail = json?.error || json?.message || text || `HTTP ${response.status}`;
      throw new Error(`TON API error ${response.status}: ${String(detail).slice(0, 220)}`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Проверяет, что отправленная через TonConnect внешняя message действительно попала в блокчейн
 * и привела к входящему платежу на казну с нужной суммой.
 */
export async function verifyTonTransferOnchainByMessageHash(args) {
  const {
    messageHashBase64,
    treasuryAddress,
    expectedNanos,
    tonApiBaseUrl,
    tonApiKey,
    timeoutMs = 12_000,
  } = args || {};
  if (!messageHashBase64 || !treasuryAddress || typeof expectedNanos !== 'bigint') {
    return { ok: false, reason: 'invalid_args' };
  }

  const base = normalizeTonApiBase(tonApiBaseUrl);
  const q = new URLSearchParams({ msg_hash: messageHashBase64, limit: '20' });
  const url = `${base}/transactionsByMessage?${q.toString()}`;
  const headers = tonApiKey ? { 'X-API-Key': tonApiKey } : {};

  let payload;
  try {
    payload = await fetchJsonWithTimeout(url, headers, timeoutMs);
  } catch (e) {
    return { ok: false, reason: 'ton_api_error', detail: String(e?.message || e) };
  }

  const txs = collectTransactionsFromTonApiResponse(payload);
  if (!Array.isArray(txs) || txs.length === 0) {
    return { ok: false, reason: 'tx_not_found' };
  }

  const matched = findIncomingToTreasury(txs, {
    treasuryAddress,
    expectedNanos,
    messageHashBase64,
  });
  if (!matched) {
    return { ok: false, reason: 'payment_not_matched' };
  }

  return {
    ok: true,
    txHash: matched.hash || matched.transaction_id?.hash || null,
    txLt: matched.lt || matched.transaction_id?.lt || null,
    txUtime: matched.utime || matched.now || null,
  };
}

export async function readCreditedFile(dataDir) {
  const p = path.join(dataDir, COIN_CREDITED_FILE);
  try {
    const raw = await readFile(p, 'utf8');
    const j = JSON.parse(raw);
    return {
      xrpl: Array.isArray(j.xrpl) ? j.xrpl : [],
      ton: Array.isArray(j.ton) ? j.ton : [],
    };
  } catch (e) {
    if (e?.code === 'ENOENT') return { xrpl: [], ton: [] };
    throw e;
  }
}

export async function writeCreditedFile(dataDir, data) {
  const p = path.join(dataDir, COIN_CREDITED_FILE);
  await mkdir(dataDir, { recursive: true });
  const tmp = `${p}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, p);
}

export async function readXrpPendingFile(dataDir) {
  const p = path.join(dataDir, COIN_XRP_PENDING_FILE);
  try {
    const raw = await readFile(p, 'utf8');
    const j = JSON.parse(raw);
    return j && typeof j === 'object' ? j : {};
  } catch (e) {
    if (e?.code === 'ENOENT') return {};
    throw e;
  }
}

export async function writeXrpPendingFile(dataDir, data) {
  const p = path.join(dataDir, COIN_XRP_PENDING_FILE);
  await mkdir(dataDir, { recursive: true });
  const tmp = `${p}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, p);
}
