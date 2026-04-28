import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Address, Cell, loadMessage } from '@ton/core';

async function ensureDir(dir) {
  if (existsSync(dir)) return;
  await mkdir(dir, { recursive: true });
}

/** Паки: XRP (дропы) — только игровые монеты. GFT с XRPL — отдельно через /api/gft/deposit.
 * Минимальные тестовые цены: XRPL не пропускает суммы <1 drop, а одинаковые подписи у нас вызывали
 * temREDUNDANT при последовательных пополнениях. 10000/20000/30000 drops — три уникальных безопасных значения. */
export const SHOP_COIN_XRP_PACKS = {
  xrp025: { label: '0.01 XRP', xrp: 0.01, drops: 10_000, coins: 5_000 },
  xrp1: { label: '0.02 XRP', xrp: 0.02, drops: 20_000, coins: 25_000 },
  xrp5: { label: '0.03 XRP', xrp: 0.03, drops: 30_000, coins: 150_000 },
};

/**
 * TON-оферы: у каждого уникальные nanos. Не включает GFT — за TON купить GFT нельзя.
 * effect: coins | crystals | cardPack | battlepass
 *
 * Минимум 0.01 TON: ниже этого порога TonConnect/Tonkeeper показывает «0 TON»,
 * сжигает больше на комиссии, и в boc может вообще не оказаться внутреннего перевода.
 */
export const SHOP_TON_OFFERS = {
  ton_c_01: { label: '0.01 TON', nanos: 10_000_000n, effect: { type: 'coins', amount: 4_000 } },
  ton_c_05: { label: '0.02 TON', nanos: 20_000_000n, effect: { type: 'coins', amount: 25_000 } },
  ton_c_1: { label: '0.03 TON', nanos: 30_000_000n, effect: { type: 'coins', amount: 60_000 } },
  ton_x_02: { label: '0.04 TON', nanos: 40_000_000n, effect: { type: 'crystals', amount: 2_000 } },
  ton_x_09: { label: '0.05 TON', nanos: 50_000_000n, effect: { type: 'crystals', amount: 10_000 } },
  ton_p_basic: { label: 'Обычный набор (0.06 TON)', nanos: 60_000_000n, effect: { type: 'cardPack', packType: 'basic' } },
  ton_p_prem: { label: 'Премиум набор (0.07 TON)', nanos: 70_000_000n, effect: { type: 'cardPack', packType: 'premium' } },
  ton_p_myth: { label: 'Мифический набор (0.08 TON)', nanos: 80_000_000n, effect: { type: 'cardPack', packType: 'mythic' } },
  ton_bp: { label: 'Battle Pass — премиум (0.09 TON)', nanos: 90_000_000n, effect: { type: 'battlepass' } },
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
  await ensureDir(dataDir);
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
  await ensureDir(dataDir);
  const tmp = `${p}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, p);
}
