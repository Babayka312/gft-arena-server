import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { XummSdk } from 'xumm-sdk';
import { Client } from 'xrpl';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pickPvpOpponentsMatchmaking } from './pvpMatchmaking.mjs';
import { recalculatePvpBattleFromMoves } from './pvpBattleReplay.mjs';
import {
  bocRootMessageHashBase64,
  bocHashId,
  findInternalNanoToAddress,
  getShopCoinPacksForClient,
  getTonOfferByReceivedNanos,
  getTonOfferOrNull,
  getXrpPackByDropsOrNull,
  getXrpPackOrNull,
  readCreditedFile,
  verifyTonTransferOnchainByMessageHash,
  readXrpPendingFile,
  writeCreditedFile,
  writeXrpPendingFile,
} from './coinShop.mjs';
import { applyHeroExpGain } from './heroProgress.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Опыт героя за бой (синхронно с src/game/heroProgress.ts) */
function computeBattleHeroXp({ mode, effectiveResult, pveContext }) {
  if (mode === 'pve' && pveContext?.isTraining) {
    return effectiveResult === 'win' ? 18 : 8;
  }
  if (mode === 'pve') {
    const lvl = Math.max(1, Math.min(6, Math.floor(Number(pveContext?.level) || 1)));
    const isBoss = Boolean(pveContext?.isBoss);
    if (effectiveResult === 'win') {
      return 24 + lvl * 6 + (isBoss ? 60 : 0);
    }
    return 8 + lvl * 2;
  }
  if (effectiveResult === 'win') {
    return 42;
  }
  return 14;
}
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const app = express();
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '5mb' }));
const PORT = Number(process.env.PORT || 5055);
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const FRONTEND_ORIGIN_PRIMARY =
  FRONTEND_ORIGINS.find((o) => o.startsWith('https://')) ?? FRONTEND_ORIGINS[0] ?? 'http://localhost:5173';
const DEV_HOST_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|\[::1\])(?::\d+)?$/;

function isDevTunnelOrigin(origin) {
  if (typeof origin !== 'string' || !origin) return false;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname.endsWith('.ngrok-free.dev') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.io') ||
      hostname.endsWith('.trycloudflare.com') ||
      hostname === 'ngrok.io'
    );
  } catch {
    return false;
  }
}
const XRPL_WS = process.env.XRPL_WS || 'wss://xrplcluster.com';
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const BATTLE_SESSIONS_FILE = path.join(DATA_DIR, 'battle-sessions.json');
const ECONOMY_LOG_FILE = path.join(DATA_DIR, 'economy-log.jsonl');
const PRESENCE_FILE = path.join(DATA_DIR, 'presence.json');

/** Render Persistent Disk монтирует mount path заранее: mkdir на корень даёт EACCES, а нам он там и не нужен. */
async function ensureDataDir() {
  if (existsSync(DATA_DIR)) return;
  await mkdir(DATA_DIR, { recursive: true });
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
      if (process.env.CORS_STRICT === '1') {
        return callback(new Error('Not allowed by CORS'));
      }
      if (DEV_HOST_ORIGIN_RE.test(origin)) {
        return callback(null, true);
      }
      if (!process.env.CORS_STRICT && isDevTunnelOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

const XUMM_API_KEY = process.env.XUMM_API_KEY;
const XUMM_API_SECRET = process.env.XUMM_API_SECRET;
const TREASURY_XRPL_ADDRESS = process.env.TREASURY_XRPL_ADDRESS;
/** UQ... / EQ... — казна для магазина монет за TON */
const TON_TREASURY_ADDRESS = (process.env.TON_TREASURY_ADDRESS || '').trim();
/** Например: https://toncenter.com/api/v3 */
const TON_API_BASE_URL = (process.env.TON_API_BASE_URL || 'https://toncenter.com/api/v3').trim();
/** API-ключ провайдера TON (рекомендуется для прода). */
const TON_API_KEY = (process.env.TON_API_KEY || '').trim();
/** 1 (default) = проверять on-chain через TON API; 0 = только офлайн-парсинг BOC */
const TON_ONCHAIN_VERIFY = String(process.env.TON_ONCHAIN_VERIFY || '1').trim() !== '0';
const GFT_CURRENCY = process.env.GFT_CURRENCY || 'GFT';
const GFT_ISSUER = process.env.GFT_ISSUER;
const GFT_NFT_ISSUER = 'r9ex7ywp4JdFGfZeS6AYXxc4AJkN4UN1Jw';
const HOLD_DURATION_MS = 6 * 60 * 60 * 1000;
const HOLD_REWARD_RATE = 0.02;
const MAX_ENERGY = 120;
/** Синхронно с `src/game/energy.ts` */
const MS_PER_ENERGY = 6 * 60 * 1000;
const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_AUTH_MAX_AGE_SECONDS = Math.max(
  60,
  Math.floor(Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS) || 24 * 60 * 60),
);

function regenEnergyState(energyRaw, regenAtRaw, now) {
  let e = Math.max(0, Math.min(MAX_ENERGY, Math.floor(Number(energyRaw) || 0)));
  let t = Number(regenAtRaw);
  if (!Number.isFinite(t) || t <= 0) t = now;
  if (e >= MAX_ENERGY) {
    return { energy: MAX_ENERGY, energyRegenAt: now };
  }
  const elapsed = now - t;
  if (elapsed < 0) {
    return { energy: e, energyRegenAt: t };
  }
  const gained = Math.floor(elapsed / MS_PER_ENERGY);
  const e2 = Math.min(MAX_ENERGY, e + gained);
  const t2 = t + gained * MS_PER_ENERGY;
  return { energy: e2, energyRegenAt: e2 >= MAX_ENERGY ? now : t2 };
}

function battleEnergyCost(mode, pveContext) {
  if (mode === 'pvp') return 10;
  if (!pveContext) return 8;
  if (pveContext.isTraining) return 0;
  if (pveContext.isBoss) return 16;
  return 8;
}

const BATTLE_SESSION_TTL_MS = 30 * 60 * 1000;
const CARD_CATALOG_FILE = path.join(__dirname, '..', 'src', 'cards', 'catalog.ts');

const CARD_PACKS = {
  basic: {
    name: 'Обычный набор',
    costCoins: 1200,
    cards: 3,
    rarityWeights: { Common: 72, Rare: 22, Epic: 5, Legendary: 1 },
  },
  premium: {
    name: 'Элитный набор',
    costCrystals: 1800,
    cards: 5,
    rarityWeights: { Common: 42, Rare: 36, Epic: 16, Legendary: 5, Mythic: 1 },
  },
  mythic: {
    name: 'Мифический набор',
    costCrystals: 4500,
    cards: 6,
    rarityWeights: { Rare: 48, Epic: 34, Legendary: 14, Mythic: 4 },
  },
};

const GFT_CARD_PACK_COSTS = {
  premium: 75,
  mythic: 180,
};

const CARD_DUPLICATE_SHARDS = {
  Common: 8,
  Rare: 20,
  Epic: 55,
  Legendary: 150,
  Mythic: 420,
};

const REFERRAL_INVITEE_BONUS = { coins: 8_000, crystals: 250 };
const REFERRAL_INVITER_TIERS = [
  { invites: 1, reward: { coins: 10_000, crystals: 300 } },
  { invites: 3, reward: { coins: 35_000, crystals: 900 } },
  { invites: 7, reward: { coins: 90_000, crystals: 2_000, gft: 50 } },
  { invites: 15, reward: { coins: 220_000, crystals: 5_000, gft: 140 } },
];

const ARTIFACT_TYPES = ['weapon', 'armor', 'accessory', 'relic'];
const ARTIFACT_TYPE_META = {
  weapon: { label: 'Оружие', emoji: '⚔️', primaryBonus: 'power', basePower: 18 },
  armor: { label: 'Броня', emoji: '🛡️', primaryBonus: 'hp', basePower: 14 },
  accessory: { label: 'Аксессуар', emoji: '📿', primaryBonus: 'critChance', basePower: 12 },
  relic: { label: 'Реликвия', emoji: '✨', primaryBonus: 'materialFind', basePower: 24 },
};
const ARTIFACT_RARITY_CONFIG = {
  Common: { maxLevel: 5, powerMultiplier: 1, quality: [45, 68] },
  Rare: { maxLevel: 8, powerMultiplier: 1.3, quality: [58, 78] },
  Epic: { maxLevel: 12, powerMultiplier: 1.75, quality: [68, 88] },
  Legendary: { maxLevel: 16, powerMultiplier: 2.35, quality: [78, 96] },
  Mythic: { maxLevel: 20, powerMultiplier: 3.2, quality: [88, 100] },
};
const PVE_ARTIFACT_RARITY_WEIGHTS = { Common: 55, Rare: 30, Epic: 11, Legendary: 3, Mythic: 1 };

let cardCatalogCache = null;

const NFT_BONUS_COLLECTIONS = [
  {
    id: 'dualForce',
    name: 'GFT Dual Force',
    issuer: GFT_NFT_ISSUER,
    taxon: 0,
    holdRewardBonus: 0.1,
    gameRewardBonus: 0.05,
  },
  {
    id: 'cryptoAlliance',
    name: 'CRYPTO ALLIANCE',
    issuer: GFT_NFT_ISSUER,
    taxon: 2,
    holdRewardBonus: 0.3,
    gameRewardBonus: 0.2,
  },
  {
    id: 'genesisCrown',
    name: 'GFT Genesis Crown',
    issuer: GFT_NFT_ISSUER,
    taxon: null,
    holdRewardBonus: 0.5,
    gameRewardBonus: 0.35,
  },
];

if (!XUMM_API_KEY || !XUMM_API_SECRET) {
  // We keep server running to show a clear error to the caller.
  console.warn('Missing XUMM_API_KEY / XUMM_API_SECRET in environment.');
}

if (!TREASURY_XRPL_ADDRESS) {
  console.warn('Missing TREASURY_XRPL_ADDRESS in environment.');
}
if (!TON_TREASURY_ADDRESS) {
  console.warn('Missing TON_TREASURY_ADDRESS — покупка монет за TON отключена.');
}
if (TON_ONCHAIN_VERIFY && !TON_API_KEY) {
  console.warn('Missing TON_API_KEY — on-chain verification may hit public TON API rate limits.');
}
if (!GFT_ISSUER) {
  console.warn('Missing GFT_ISSUER in environment.');
}
if (!TELEGRAM_BOT_TOKEN) {
  console.warn('Missing TELEGRAM_BOT_TOKEN — Telegram WebApp identity verification is disabled for Telegram logins.');
}

const xumm = XUMM_API_KEY && XUMM_API_SECRET ? new XummSdk(XUMM_API_KEY, XUMM_API_SECRET) : null;

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function verifyTelegramWebAppInitData(initData) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, status: 503, error: 'Set TELEGRAM_BOT_TOKEN to enable Telegram login' };
  }
  if (typeof initData !== 'string' || !initData.trim()) {
    return { ok: false, status: 401, error: 'Missing Telegram initData' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash') || '';
  if (!hash) {
    return { ok: false, status: 401, error: 'Missing Telegram initData hash' };
  }
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(hash, expectedHash)) {
    return { ok: false, status: 401, error: 'Invalid Telegram initData signature' };
  }

  const authDate = Math.floor(Number(params.get('auth_date')) || 0);
  if (!authDate) {
    return { ok: false, status: 401, error: 'Missing Telegram auth_date' };
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds < 0 || ageSeconds > TELEGRAM_AUTH_MAX_AGE_SECONDS) {
    return { ok: false, status: 401, error: 'Expired Telegram initData' };
  }

  let user = null;
  try {
    const rawUser = params.get('user');
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return { ok: false, status: 400, error: 'Invalid Telegram user payload' };
  }
  const id = Number(user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, status: 401, error: 'Telegram user id is missing' };
  }

  return { ok: true, user: { ...user, id } };
}

/** @param {string} identityKey */
function parseTelegramUserIdFromIdentityKey(identityKey) {
  const m = /^telegram:(\d{1,20})$/.exec(identityKey);
  return m ? m[1] : null;
}

/** @param {unknown} raw */
function normalizeTelegramUserIdFromBody(raw) {
  const s =
    typeof raw === 'number' && Number.isFinite(raw) && raw > 0
      ? String(Math.floor(raw))
      : typeof raw === 'string'
        ? raw.trim()
        : '';
  if (/^\d{1,20}$/.test(s)) return s;
  return null;
}

async function readPlayersRegistry() {
  try {
    const raw = await readFile(PLAYERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const tp = parsed.telegramToPlayer;
    /** @type {Record<string, number>} */
    const telegramToPlayer =
      tp && typeof tp === 'object' && !Array.isArray(tp)
        ? Object.fromEntries(Object.entries(tp).filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => [String(k).trim(), Math.floor(Number(v))]))
        : {};
    return {
      nextId: Number(parsed.nextId) > 0 ? Number(parsed.nextId) : 1,
      players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
      telegramToPlayer,
    };
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e;
    return { nextId: 1, players: {}, telegramToPlayer: {} };
  }
}

async function writePlayersRegistry(registry) {
  await ensureDataDir();
  const tmp = `${PLAYERS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(registry, null, 2), 'utf8');
  await rename(tmp, PLAYERS_FILE);
}

async function readProgressRegistry() {
  let raw = '';
  try {
    raw = await readFile(PROGRESS_FILE, 'utf8');
  } catch (e) {
    if (e?.code === 'ENOENT') return {};
    throw e;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (parseErr) {
    console.error('[progress] Invalid JSON in progress.json:', parseErr?.message || parseErr);
    try {
      await ensureDataDir();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backup = path.join(DATA_DIR, `progress.corrupt-${stamp}.json`);
      await writeFile(backup, raw, 'utf8');
      await unlink(PROGRESS_FILE);
      console.warn('[progress] Backed up corrupt file to', backup, '- using empty registry until next save');
    } catch (backupErr) {
      console.warn('[progress] Could not backup/remove corrupt file:', backupErr?.message || backupErr);
    }
    return {};
  }
}

async function writeProgressRegistry(registry) {
  await ensureDataDir();
  let payload;
  try {
    payload = JSON.stringify(registry, null, 2);
  } catch (e) {
    console.error('[progress] JSON.stringify(registry) failed:', e?.message || e);
    throw e;
  }
  const retryable = (e) => {
    const c = e?.code;
    return c === 'EBUSY' || c === 'EPERM' || c === 'EACCES' || c === 'UNKNOWN';
  };
  // Уникальный tmp на каждую попытку: иначе параллельные PUT (автосейв ~1 Гц) затирают один progress.json.tmp и rename падает → 500.
  for (let attempt = 0; attempt < 6; attempt++) {
    const tmp = path.join(
      DATA_DIR,
      `.progress-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}.tmp`,
    );
    try {
      await writeFile(tmp, payload, 'utf8');
      await rename(tmp, PROGRESS_FILE);
      return;
    } catch (e) {
      await unlink(tmp).catch(() => {});
      if (!retryable(e) || attempt === 5) {
        console.error('[progress] writeProgressRegistry failed:', e?.code || e?.errno, e?.message || e);
        throw e;
      }
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
}

/** Сериализация read → write по progress.json: иначе параллельные запросы теряют чужие правки. */
let progressRwExclusive = Promise.resolve();

function enqueueProgressRwTask(task) {
  const next = progressRwExclusive.then(() => task());
  progressRwExclusive = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** 400/404/409 изнутри enqueueProgressRwTask (нельзя return res — ответ снаружи). */
function clientHttpError(status, body) {
  const err = new Error('clientHttp');
  err.clientHttp = true;
  err.status = status;
  err.body = body;
  return err;
}

async function readBattleSessions() {
  try {
    const raw = await readFile(BATTLE_SESSIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e;
    return {};
  }
}

async function writeBattleSessions(sessions) {
  await ensureDataDir();
  const tmp = `${BATTLE_SESSIONS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(sessions, null, 2), 'utf8');
  await rename(tmp, BATTLE_SESSIONS_FILE);
}

async function readPresenceRegistry() {
  let raw = '';
  try {
    raw = await readFile(PRESENCE_FILE, 'utf8');
  } catch (e) {
    if (e?.code === 'ENOENT') return { players: {} };
    throw e;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.players && typeof parsed.players === 'object') return parsed;
  } catch (parseErr) {
    console.error('[presence] Invalid JSON in presence.json:', parseErr?.message || parseErr);
    try {
      await ensureDataDir();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backup = path.join(DATA_DIR, `presence.corrupt-${stamp}.json`);
      await writeFile(backup, raw, 'utf8');
      await unlink(PRESENCE_FILE);
      console.warn('[presence] Backed up corrupt file to', backup, '- using empty presence until next write');
    } catch (backupErr) {
      console.warn('[presence] Could not backup/remove corrupt file:', backupErr?.message || backupErr);
    }
  }
  return { players: {} };
}

async function writePresenceRegistry(data) {
  await ensureDataDir();
  const payload = JSON.stringify(data, null, 2);
  for (let attempt = 0; attempt < 5; attempt++) {
    const tmp = path.join(
      DATA_DIR,
      `.presence-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}.tmp`,
    );
    try {
      await writeFile(tmp, payload, 'utf8');
      await rename(tmp, PRESENCE_FILE);
      return;
    } catch (e) {
      await unlink(tmp).catch(() => {});
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
  }
}

async function appendEconomyLog(entry) {
  const record = {
    at: new Date().toISOString(),
    ...entry,
  };

  try {
    await ensureDataDir();
    await appendFile(ECONOMY_LOG_FILE, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (e) {
    console.warn('Failed to write economy log:', e?.message || e);
  }
}

function isValidPlayerId(value) {
  return /^\d+$/.test(String(value ?? ''));
}

function isValidXrplAccount(value) {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(String(value ?? '').trim());
}

function createDefaultProgress() {
  return {
    version: 1,
    userName: '',
    mainHero: null,
    currencies: {
      gft: 1500,
      crystals: 10000,
      coins: 20000,
      rating: 1240,
      energy: MAX_ENERGY,
      /** ms: якорь тиков +1 энергии; 0 = не задано (трактуем как «сейчас») */
      energyRegenAt: 0,
    },
    pve: {
      currentChapter: 1,
      currentLevel: 1,
    },
    cards: {
      collection: {},
      shards: 0,
      squadIds: [],
    },
    artifacts: {
      items: [],
      equipped: {},
      materials: 0,
    },
    battlePass: {
      premium: false,
      claimedRewards: [],
      questProgress: {},
    },
    hold: {
      endTime: null,
      lockedGft: 0,
      earnings: 0,
      rewardRate: HOLD_REWARD_RATE,
    },
    dailyReward: {
      claimedDate: '',
    },
    nftSim: {
      dualForce: 0,
      cryptoAlliance: 0,
      genesisCrown: 0,
    },
    clientNotices: [],
    referrals: {
      invitedBy: null,
      invitedPlayers: [],
      inviterClaimedTiers: [],
      inviteeBonusClaimed: false,
    },
    savedAt: new Date().toISOString(),
  };
}

function normalizeReferrals(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const invitedByRaw = src.invitedBy;
  const invitedBy = /^[1-9]\d*$/.test(String(invitedByRaw ?? '')) ? String(invitedByRaw) : null;
  const invitedPlayers = Array.isArray(src.invitedPlayers)
    ? Array.from(new Set(src.invitedPlayers.map((v) => String(v)).filter((v) => /^[1-9]\d*$/.test(v))))
    : [];
  const inviterClaimedTiers = Array.isArray(src.inviterClaimedTiers)
    ? Array.from(new Set(src.inviterClaimedTiers.map((v) => Math.floor(Number(v))).filter((v) => Number.isFinite(v) && v > 0)))
    : [];
  return {
    invitedBy,
    invitedPlayers,
    inviterClaimedTiers,
    inviteeBonusClaimed: Boolean(src.inviteeBonusClaimed),
  };
}

function normalizeProgress(progress) {
  const fallback = createDefaultProgress();
  const source = progress && typeof progress === 'object' && !Array.isArray(progress) ? progress : {};
  const sourceCards = source.cards && typeof source.cards === 'object' ? source.cards : {};
  const sourceArtifacts = source.artifacts && typeof source.artifacts === 'object' ? source.artifacts : {};
  return {
    ...fallback,
    ...source,
    currencies: { ...fallback.currencies, ...(source.currencies ?? {}) },
    pve: { ...fallback.pve, ...(source.pve ?? {}) },
    cards: {
      ...fallback.cards,
      ...sourceCards,
      collection: sourceCards.collection && typeof sourceCards.collection === 'object' ? sourceCards.collection : fallback.cards.collection,
      squadIds: Array.isArray(sourceCards.squadIds) ? sourceCards.squadIds : fallback.cards.squadIds,
    },
    artifacts: {
      ...fallback.artifacts,
      ...sourceArtifacts,
      items: Array.isArray(sourceArtifacts.items) ? sourceArtifacts.items : fallback.artifacts.items,
    },
    battlePass: { ...fallback.battlePass, ...(source.battlePass ?? {}) },
    hold: { ...fallback.hold, ...(source.hold ?? {}) },
    dailyReward: { ...fallback.dailyReward, ...(source.dailyReward ?? {}) },
    nftSim: {
      ...fallback.nftSim,
      ...(source.nftSim && typeof source.nftSim === 'object' ? source.nftSim : {}),
    },
    clientNotices: Array.isArray(source.clientNotices) ? source.clientNotices : fallback.clientNotices,
    referrals: normalizeReferrals(source.referrals ?? fallback.referrals),
  };
}

function buildGrantClientMessage(applied) {
  const parts = [];
  const curLabels = { gft: 'GFT', crystals: 'кристаллов', coins: 'монет', rating: 'рейтинга', energy: 'энергии' };
  if (applied.currencies && typeof applied.currencies === 'object') {
    for (const [k, v] of Object.entries(applied.currencies)) {
      const n = Math.floor(Number(v));
      if (!n) continue;
      parts.push(`+${n} ${curLabels[k] || k}`);
    }
  }
  if (applied.materials) parts.push(`+${applied.materials} материалов`);
  if (applied.shards) parts.push(`+${applied.shards} осколков`);
  if (applied.collection && typeof applied.collection === 'object' && Object.keys(applied.collection).length) {
    const total = Object.values(applied.collection).reduce((a, c) => a + (Number(c) || 0), 0);
    const kinds = Object.keys(applied.collection).length;
    parts.push(
      `+карт: ${total} шт. (${kinds} ${kinds === 1 ? 'вид' : 'видов'})`,
    );
  }
  if (applied.battlePassPremium) parts.push('премиум Battle Pass');
  return parts.length > 0 ? `Вам зачислено: ${parts.join(', ')}` : 'Получено начисление на аккаунт';
}

function appendClientNotice(progress, message) {
  if (!Array.isArray(progress.clientNotices)) progress.clientNotices = [];
  const id = `g-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  progress.clientNotices.push({ id, at: new Date().toISOString(), message });
  if (progress.clientNotices.length > 32) {
    progress.clientNotices = progress.clientNotices.slice(-32);
  }
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function rollWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries.at(-1)?.[0];
}

function getBonusValue(key, rarity, quality, basePower) {
  const rarityMultiplier = ARTIFACT_RARITY_CONFIG[rarity].powerMultiplier;
  const raw = basePower * rarityMultiplier * (quality / 100);
  if (key === 'hp') return Math.round(raw * 9);
  if (key === 'critChance') return Math.round((2 + raw * 0.18) * 10) / 10;
  if (key === 'critDamage') return Math.round((8 + raw * 0.55) * 10) / 10;
  if (key === 'materialFind') return Math.round((3 + raw * 0.22) * 10) / 10;
  return Math.round(raw);
}

function createServerPveArtifact(chapter, isBoss) {
  const type = randomItem(ARTIFACT_TYPES);
  const rarity = isBoss ? rollWeighted({ Rare: 45, Epic: 34, Legendary: 16, Mythic: 5 }) : rollWeighted(PVE_ARTIFACT_RARITY_WEIGHTS);
  const meta = ARTIFACT_TYPE_META[type];
  const rarityConfig = ARTIFACT_RARITY_CONFIG[rarity];
  const quality = randomInt(rarityConfig.quality[0], rarityConfig.quality[1]);
  const power = Math.round(meta.basePower * rarityConfig.powerMultiplier * (quality / 100) * (1 + chapter * 0.04));

  return {
    id: `artifact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${isBoss ? 'Трофей босса' : 'Трофей PVE'}: ${meta.label}`,
    type,
    rarity,
    power,
    level: 1,
    emoji: meta.emoji,
    quality,
    primaryBonus: {
      key: meta.primaryBonus,
      value: getBonusValue(meta.primaryBonus, rarity, quality, meta.basePower),
    },
    secondaryBonuses: [],
    maxLevel: rarityConfig.maxLevel,
    createdFrom: 'pve',
    locked: false,
  };
}

function shouldDropPveArtifact(isBoss) {
  return Math.random() < (isBoss ? 0.75 : 0.12);
}

async function getCardCatalog() {
  if (cardCatalogCache) return cardCatalogCache;
  const raw = await readFile(CARD_CATALOG_FILE, 'utf8');
  const cards = [...raw.matchAll(/id: '([^']+)'[\s\S]*?name: '([^']+)'[\s\S]*?rarity: '([^']+)'/g)].map(match => ({
    id: match[1],
    name: match[2],
    rarity: match[3],
  }));
  cardCatalogCache = cards;
  return cards;
}

function rollCardFromCatalog(cards, weights) {
  const rarity = rollWeighted(weights);
  const pool = cards.filter(card => card.rarity === rarity);
  return randomItem(pool.length > 0 ? pool : cards);
}

function grantCardPack(progress, packType, cards) {
  const pack = CARD_PACKS[packType];
  const results = Array.from({ length: pack.cards }, () => {
    const card = rollCardFromCatalog(cards, pack.rarityWeights);
    const isDuplicate = (progress.cards.collection[card.id] ?? 0) > 0;
    const shards = isDuplicate ? CARD_DUPLICATE_SHARDS[card.rarity] ?? 0 : 0;
    progress.cards.collection[card.id] = (progress.cards.collection[card.id] ?? 0) + 1;
    progress.cards.shards += shards;
    return { cardId: card.id, name: card.name, rarity: card.rarity, isDuplicate, shards };
  });
  return { packName: pack.name, results };
}

function summarizeNftBonuses(nfts) {
  const collections = NFT_BONUS_COLLECTIONS.map(collection => {
    const count = collection.taxon == null
      ? 0
      : nfts.filter(nft => nft.Issuer === collection.issuer && Number(nft.NFTokenTaxon) === collection.taxon).length;
    return {
      id: collection.id,
      name: collection.name,
      available: collection.taxon != null,
      owned: count > 0,
      count,
      holdRewardBonus: count > 0 ? collection.holdRewardBonus : 0,
      gameRewardBonus: count > 0 ? collection.gameRewardBonus : 0,
    };
  });

  return {
    collections,
    holdRewardBonus: collections.reduce((sum, collection) => sum + collection.holdRewardBonus, 0),
    gameRewardBonus: collections.reduce((sum, collection) => sum + collection.gameRewardBonus, 0),
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Бета: виртуальные NFT (nftSim) суммируются с ончейн-списком для расчёта бонусов.
 */
function mergeNftBonusesWithSimulation(base, sim) {
  const s = { dualForce: 0, cryptoAlliance: 0, genesisCrown: 0, ...sim };
  const collections = NFT_BONUS_COLLECTIONS.map(cfg => {
    const chainRow = base.collections.find(c => c.id === cfg.id);
    const chainCount = chainRow?.count ?? 0;
    const add = Math.max(0, Math.min(20, Math.floor(Number(s[cfg.id]) || 0)));
    const count = chainCount + add;
    const canApply = cfg.taxon != null || cfg.id === 'genesisCrown';
    return {
      id: cfg.id,
      name: cfg.name,
      available: cfg.taxon != null,
      owned: count > 0,
      count,
      holdRewardBonus: count > 0 && canApply ? cfg.holdRewardBonus : 0,
      gameRewardBonus: count > 0 && canApply ? cfg.gameRewardBonus : 0,
    };
  });
  return {
    collections,
    holdRewardBonus: collections.reduce((sum, c) => sum + c.holdRewardBonus, 0),
    gameRewardBonus: collections.reduce((sum, c) => sum + c.gameRewardBonus, 0),
    checkedAt: base.checkedAt,
  };
}

async function getNftBonusesForAccount(account) {
  if (!isValidXrplAccount(account)) return summarizeNftBonuses([]);

  const client = new Client(XRPL_WS);
  try {
    await client.connect();
    const nfts = [];
    let marker;

    do {
      const response = await client.request({
        command: 'account_nfts',
        account,
        ledger_index: 'validated',
        marker,
        limit: 400,
      });
      nfts.push(...(response.result.account_nfts ?? []));
      marker = response.result.marker;
    } while (marker);

    return summarizeNftBonuses(nfts);
  } finally {
    await client.disconnect().catch(() => {});
  }
}

async function checkGftTrustlineAndBalance(account, requiredAmount) {
  if (!isValidXrplAccount(account)) {
    return { ok: false, reason: 'invalid_account' };
  }
  const need = Number(requiredAmount);
  if (!Number.isFinite(need) || need <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }

  const client = new Client(XRPL_WS);
  try {
    await client.connect();
    const lines = [];
    let marker;
    do {
      const response = await client.request({
        command: 'account_lines',
        account,
        ledger_index: 'validated',
        marker,
        limit: 400,
      });
      lines.push(...(response.result.lines ?? []));
      marker = response.result.marker;
    } while (marker);

    const line = lines.find((l) => l?.currency === GFT_CURRENCY && l?.account === GFT_ISSUER);
    if (!line) {
      return { ok: false, reason: 'no_trustline' };
    }
    const balance = Number(line.balance ?? 0);
    if (!Number.isFinite(balance) || balance < need) {
      return { ok: false, reason: 'insufficient_balance', balance: Number.isFinite(balance) ? balance : 0 };
    }
    return { ok: true, balance };
  } finally {
    await client.disconnect().catch(() => {});
  }
}

async function getMergedNftBonuses(account, sim) {
  const base = isValidXrplAccount(String(account ?? '').trim())
    ? await getNftBonusesForAccount(String(account).trim())
    : summarizeNftBonuses([]);
  if (!sim || typeof sim !== 'object') return base;
  return mergeNftBonusesWithSimulation(base, sim);
}

function getNftCollectionCount(nftBonuses, id) {
  return nftBonuses.collections.find(collection => collection.id === id)?.count ?? 0;
}

function getDailyReward(nftBonuses) {
  const dualCount = getNftCollectionCount(nftBonuses, 'dualForce');
  const allianceCount = getNftCollectionCount(nftBonuses, 'cryptoAlliance');
  const genesisCount = getNftCollectionCount(nftBonuses, 'genesisCrown');
  const weightedCountBonus = Math.min(1.75, dualCount * 0.1 + allianceCount * 0.25 + genesisCount * 0.45);

  const tier = genesisCount > 0
    ? { name: 'Genesis Crown', description: 'Будущий максимальный NFT-уровень', coins: 12000, crystals: 900, materials: 350, shards: 250, gft: 75 }
    : allianceCount > 0
      ? { name: 'Crypto Alliance', description: 'Премиальный NFT-уровень', coins: 7000, crystals: 450, materials: 180, shards: 120, gft: 25 }
      : dualCount > 0
        ? { name: 'Dual Force', description: 'Базовый NFT-уровень', coins: 3500, crystals: 180, materials: 80, shards: 50, gft: 0 }
        : { name: 'Free', description: 'Бесплатная ежедневная награда', coins: 2000, crystals: 100, materials: 40, shards: 25, gft: 0 };

  return {
    tier: tier.name,
    description: weightedCountBonus > 0 ? `${tier.description} • множитель x${(1 + weightedCountBonus).toFixed(2)}` : tier.description,
    coins: Math.round(tier.coins * (1 + weightedCountBonus)),
    crystals: Math.round(tier.crystals * (1 + weightedCountBonus)),
    materials: Math.round(tier.materials * (1 + weightedCountBonus)),
    shards: Math.round(tier.shards * (1 + weightedCountBonus)),
    gft: Math.round(tier.gft * (1 + weightedCountBonus)),
  };
}

function persistPlayerProgress(registry, id, progress) {
  const updatedAt = new Date().toISOString();
  progress.savedAt = updatedAt;
  registry[id] = { progress, updatedAt };
  return updatedAt;
}

function createBattleSessionId() {
  return `battle-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBattleMode(value) {
  return value === 'pve' ? 'pve' : 'pvp';
}

function normalizeBattleResult(value) {
  return value === 'lose' ? 'lose' : 'win';
}

function normalizePveContext(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    chapter: Math.max(1, Math.min(20, Math.floor(Number(source.chapter) || 1))),
    level: Math.max(1, Math.min(6, Math.floor(Number(source.level) || 1))),
    isBoss: Boolean(source.isBoss),
    isTraining: Boolean(source.isTraining),
  };
}

function pruneBattleSessions(sessions, now = Date.now()) {
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (!session || session.claimed || Number(session.expiresAt) <= now) {
      delete sessions[sessionId];
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ========================= SHOP API =========================

// 1) Список паков монет (формат как у /api/shop ниже: xrp, ton + tonEnabled)
app.get('/api/shop/coin-packs', (_req, res) => {
  try {
    res.json({
      ok: true,
      ...getShopCoinPacksForClient(),
      tonEnabled: Boolean(TON_TREASURY_ADDRESS),
    });
  } catch (e) {
    console.error('coin-packs error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

/** Публичные адреса казны — нужны клиенту для предварительной проверки. */
app.get('/api/shop/treasury', (_req, res) => {
  res.json({
    ok: true,
    xrpl: TREASURY_XRPL_ADDRESS || null,
    ton: TON_TREASURY_ADDRESS || null,
  });
});

// 2) Покупка монет за TON — подбор офера по сумме nanoTON во входящем переводе
app.post('/api/shop/ton/purchase', (req, res) => {
  try {
    const { nanos } = req.body ?? {};
    const nanoStr = String(nanos ?? '').replace(/\s/g, '');
    if (!/^\d+$/.test(nanoStr)) {
      return res.status(400).json({ ok: false, error: 'Invalid TON amount' });
    }
    const offer = getTonOfferByReceivedNanos(BigInt(nanoStr));
    if (!offer) {
      return res.status(404).json({ ok: false, error: 'No matching TON offer' });
    }
    res.json({ ok: true, offer });
  } catch (e) {
    console.error('TON purchase error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// 3) По id офера или legacy-ключа (не tx hash блокчейна)
app.get('/api/shop/ton/check', (req, res) => {
  try {
    const hash = typeof req.query?.hash === 'string' ? req.query.hash.trim() : '';
    if (!hash) return res.status(400).json({ ok: false, error: 'Missing hash' });

    const offer = getTonOfferOrNull(hash);
    if (!offer) {
      return res.status(404).json({ ok: false, error: 'Payment not found' });
    }

    res.json({ ok: true, offer });
  } catch (e) {
    console.error('TON check error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// 4) Покупка монет за XRP — по сумме drops
app.post('/api/shop/xrp/purchase', (req, res) => {
  try {
    const { drops } = req.body ?? {};
    const d = Number(drops);
    if (!Number.isFinite(d) || d <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid XRP amount' });
    }

    const pack = getXrpPackByDropsOrNull(d);
    if (!pack) {
      return res.status(404).json({ ok: false, error: 'No matching XRP pack' });
    }

    res.json({ ok: true, pack });
  } catch (e) {
    console.error('XRP purchase error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// 5) Состояние pending / credited по монетам за XRP
app.get('/api/shop/xrp/check', async (req, res) => {
  try {
    const pending = await readXrpPendingFile(DATA_DIR);
    const credited = await readCreditedFile(DATA_DIR);

    res.json({
      ok: true,
      pending,
      credited,
      ...(typeof req.query?.tx === 'string' && req.query.tx.trim()
        ? { queryTx: req.query.tx.trim() }
        : {}),
    });
  } catch (e) {
    console.error('XRP check error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// 6) Хэш TON BOC (base64) → детерминированный id (как в verify)
app.post('/api/shop/ton/boc-hash', (req, res) => {
  try {
    const boc = req.body?.boc;
    if (!boc || typeof boc !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing BOC' });
    }

    const id = bocHashId(boc);
    res.json({ ok: true, id });
  } catch (e) {
    console.error('boc-hash error:', e);
    res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// ======================= END SHOP API =======================

/** Публичный рейтинг тестеров: все игроки из progress.json (без моков на клиенте). */
app.get('/api/arena/leaderboard', async (req, res) => {
  const period = req.query.period === 'month' ? 'month' : 'week';
  try {
    const registry = await readProgressRegistry();
    const rows = [];
    for (const [pid, wrap] of Object.entries(registry)) {
      if (!isValidPlayerId(pid)) continue;
      const progress = normalizeProgress(wrap?.progress);
      const ratingRaw = Number(progress.currencies?.rating);
      const ratingN = Number.isFinite(ratingRaw) ? ratingRaw : 1000;
      const level = Math.max(1, Math.floor(Number(progress.mainHero?.level)) || 1);
      const name = String(progress.userName || '').trim() || `Игрок #${pid}`;
      const score = period === 'week' ? ratingN : ratingN * 4 + level * 65;
      const wins =
        period === 'week'
          ? Math.max(1, Math.floor((ratingN - 1000) / 18))
          : Math.max(4, Math.floor((ratingN - 1000) / 5));
      rows.push({ playerId: pid, name, score, wins });
    }
    rows.sort((a, b) => b.score - a.score);
    const entries = rows.slice(0, 100).map((r, i) => ({
      place: i + 1,
      playerId: r.playerId,
      name: r.name,
      score: r.score,
      wins: r.wins,
    }));
    res.json({ ok: true, period, entries });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/** Синхронно с `src/zodiacAvatars.ts` — порядок id героя 1…12 */
const ZODIAC_ORDER_RU = [
  'Овен',
  'Телец',
  'Близнецы',
  'Рак',
  'Лев',
  'Дева',
  'Весы',
  'Скорпион',
  'Стрелец',
  'Козерог',
  'Водолей',
  'Рыбы',
];

function zodiacFromPlayerId(playerId) {
  let h = 0;
  const s = String(playerId);
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return ZODIAC_ORDER_RU[h % 12];
}

/** Знак для списка PvP: строка из прогресса → id героя (1–12) → стабильный hash */
function resolvePvpZodiac(mainHero, playerId) {
  if (mainHero && typeof mainHero === 'object') {
    if (typeof mainHero.zodiac === 'string') {
      const z = String(mainHero.zodiac).trim();
      if (z) return z;
    }
    const hid = Math.floor(Number(mainHero.id));
    if (Number.isFinite(hid) && hid >= 1 && hid <= 12) {
      return ZODIAC_ORDER_RU[hid - 1];
    }
  }
  return zodiacFromPlayerId(playerId);
}

/**
 * PvP matchmaking: пул живых аккаунтов из progress.json, три полосы по дистанции рейтинга и квоты
 * (~50% / ~35% / ~15%), перемешивание по сиду (день + playerId + query vary для «Обновить»).
 */
app.get('/api/arena/pvp-opponents', async (req, res) => {
  const myId = String(req.query.playerId ?? '').trim();
  if (!isValidPlayerId(myId)) {
    return res.status(400).json({ error: 'Query playerId is required' });
  }
  const limitRaw = Math.floor(Number(req.query.limit));
  const listSize = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;
  const vary = String(req.query.vary ?? '').trim().slice(0, 48);
  const dayKey = new Date().toISOString().slice(0, 10);
  try {
    const registry = await readProgressRegistry();
    const me = normalizeProgress(registry[myId]?.progress);
    const myRating = Number.isFinite(Number(me.currencies?.rating)) ? Number(me.currencies.rating) : 1000;

    const candidates = [];
    for (const [pid, wrap] of Object.entries(registry)) {
      if (!isValidPlayerId(pid) || pid === myId) continue;
      const progress = normalizeProgress(wrap?.progress);
      const ratingRaw = Number(progress.currencies?.rating);
      const ratingN = Number.isFinite(ratingRaw) ? ratingRaw : 1000;
      const name = String(progress.userName || '').trim() || `Игрок #${pid}`;
      const hero = progress.mainHero;
      const fromHero = Number(hero?.basePower);
      const power = Math.max(30, Math.min(160, Number.isFinite(fromHero) && fromHero > 0
        ? fromHero
        : 50 + Math.floor((ratingN - 1000) / 20)));
      const maxHP = power * 10;
      const zodiac = resolvePvpZodiac(hero, pid);
      const hid = hero && typeof hero === 'object' ? Math.floor(Number(hero.id)) : NaN;
      const mainHeroId = Number.isFinite(hid) && hid >= 1 && hid <= 12 ? hid : undefined;
      candidates.push({
        playerId: pid,
        name,
        rating: ratingN,
        power,
        maxHP,
        zodiac,
        ...(mainHeroId != null ? { mainHeroId } : {}),
      });
    }
    const { opponents, meta } = pickPvpOpponentsMatchmaking(myRating, candidates, {
      listSize,
      seed: `${dayKey}:${myId}:${vary || '0'}`,
    });
    res.json({
      ok: true,
      myRating,
      count: opponents.length,
      opponents,
      matchmaking: meta,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/presence/heartbeat', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const userName = String(req.body?.userName ?? '').trim().slice(0, 64);
  const label = String(req.body?.label ?? '').trim().slice(0, 64);

  try {
    const registry = await readPresenceRegistry();
    if (!registry.players) registry.players = {};
    registry.players[id] = {
      lastSeen: Date.now(),
      ...(userName ? { userName } : {}),
      ...(label ? { label } : {}),
      userAgent: String(req.get('user-agent') ?? '').slice(0, 200),
    };
    await writePresenceRegistry(registry);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/admin/presence', async (req, res) => {
  const token = String(req.get('x-admin-token') ?? '');
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Set ADMIN_TOKEN in .env to enable admin presence' });
  }
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const maxAgeSec = Math.max(10, Math.min(600, Math.floor(Number(req.query.maxAgeSec) || 120)));
  const now = Date.now();
  const threshold = now - maxAgeSec * 1000;

  try {
    const registry = await readPresenceRegistry();
    const players = registry.players && typeof registry.players === 'object' ? registry.players : {};
    const online = [];
    const offline = [];

    for (const [playerId, row] of Object.entries(players)) {
      if (!row || typeof row.lastSeen !== 'number') continue;
      const lastSeenIso = new Date(row.lastSeen).toISOString();
      const ageSec = Math.max(0, Math.round((now - row.lastSeen) / 1000));
      const entry = {
        playerId,
        lastSeen: row.lastSeen,
        lastSeenIso,
        ageSec,
        userName: row.userName,
        label: row.label,
        userAgent: row.userAgent,
      };
      if (row.lastSeen >= threshold) online.push(entry);
      else offline.push(entry);
    }

    online.sort((a, b) => a.lastSeen - b.lastSeen);
    offline.sort((a, b) => b.lastSeen - a.lastSeen);

    res.json({
      ok: true,
      now: new Date().toISOString(),
      maxAgeSec,
      countOnline: online.length,
      online,
      countOffline: offline.length,
      offline: offline.slice(0, 100),
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * Бета: случайно выдать виртуальные NFT (nftSim) случайным игрокам с прогрессом.
 * Не переносит NFT в XRPL — только бонусы в игре.
 */
app.post('/api/admin/nft-sim/roll', async (req, res) => {
  const token = String(req.get('x-admin-token') ?? '');
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Set ADMIN_TOKEN in .env' });
  }
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sampleSize = Math.max(1, Math.min(100, Math.floor(Number(req.body?.sampleSize) || 6)));
  const maxEach = Math.max(0, Math.min(5, Math.floor(Number(req.body?.maxEach) || 2)));
  /** По умолчанию только коллекции 1–2 (Dual Force, CRYPTO ALLIANCE). Genesis не трогаем. */
  const includeGenesis = req.body?.includeGenesis === true;

  try {
    const results = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const ids = Object.keys(registry).filter(isValidPlayerId);
      for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const picked = ids.slice(0, Math.min(sampleSize, ids.length));
      const out = [];

      for (const pid of picked) {
        const progress = normalizeProgress(registry[pid]?.progress);
        const prevSim = progress.nftSim && typeof progress.nftSim === 'object' ? progress.nftSim : {};
        const prevGenesis = Math.max(0, Math.min(5, Math.floor(Number(prevSim.genesisCrown) || 0)));
        progress.nftSim = {
          dualForce: randomInt(0, maxEach),
          cryptoAlliance: randomInt(0, maxEach),
          genesisCrown: includeGenesis ? randomInt(0, Math.min(1, maxEach)) : prevGenesis,
        };
        const updatedAt = persistPlayerProgress(registry, pid, progress);
        out.push({ playerId: pid, nftSim: progress.nftSim, updatedAt });
      }

      await writeProgressRegistry(registry);
      return out;
    });
    for (const row of results) {
      await appendEconomyLog({
        playerId: String(row.playerId),
        action: 'nft_sim_random_grant',
        context: row.nftSim,
      });
    }
    res.json({ ok: true, includeGenesis, count: results.length, results });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * Админ: начислить валюту / материалы / осколки / карты игроку по id.
 * Все числа в теле — прибавка (delta). Итог не уходит ниже 0; энергия не выше MAX_ENERGY.
 */
app.post('/api/admin/player/:id/grant', async (req, res) => {
  const token = String(req.get('x-admin-token') ?? '');
  if (!ADMIN_TOKEN) {
    return res.status(503).json({ error: 'Set ADMIN_TOKEN in .env' });
  }
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return res.status(400).json({ error: 'JSON object body required' });
  }

  try {
    const { applied, progress, updatedAt } = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      if (!registry[id]) {
        registry[id] = { progress: null, updatedAt: null };
      }
      const progress0 = normalizeProgress(registry[id].progress);
      const applied = { currencies: {}, materials: null, shards: null, collection: {}, battlePassPremium: null };

      const cur = progress0.currencies;
      const currencyKeys = ['gft', 'crystals', 'coins', 'rating', 'energy'];
      if (b.currencies && typeof b.currencies === 'object') {
        for (const k of currencyKeys) {
          if (b.currencies[k] === undefined) continue;
          const d = Math.floor(Number(b.currencies[k]));
          if (!Number.isFinite(d)) {
            throw clientHttpError(400, { error: `Invalid currencies.${k}` });
          }
          const base = Number(cur[k]) || 0;
          if (k === 'energy') {
            cur[k] = Math.max(0, Math.min(MAX_ENERGY, base + d));
          } else {
            cur[k] = Math.max(0, base + d);
          }
          applied.currencies[k] = d;
        }
      }

      if (b.materials !== undefined) {
        const d = Math.floor(Number(b.materials));
        if (!Number.isFinite(d)) throw clientHttpError(400, { error: 'Invalid materials' });
        progress0.artifacts.materials = Math.max(0, (Number(progress0.artifacts.materials) || 0) + d);
        applied.materials = d;
      }

      if (b.shards !== undefined) {
        const d = Math.floor(Number(b.shards));
        if (!Number.isFinite(d)) throw clientHttpError(400, { error: 'Invalid shards' });
        progress0.cards.shards = Math.max(0, (Number(progress0.cards.shards) || 0) + d);
        applied.shards = d;
      }

      if (b.collection && typeof b.collection === 'object') {
        if (!progress0.cards.collection) progress0.cards.collection = {};
        for (const [cardId, raw] of Object.entries(b.collection)) {
          if (!/^[a-z0-9_-]{1,80}$/i.test(cardId)) {
            throw clientHttpError(400, { error: `Invalid card id: ${cardId}` });
          }
          const d = Math.floor(Number(raw));
          if (!Number.isFinite(d) || d < 0) {
            throw clientHttpError(400, { error: `Invalid collection count: ${cardId}` });
          }
          progress0.cards.collection[cardId] = (Number(progress0.cards.collection[cardId]) || 0) + d;
          applied.collection[cardId] = d;
        }
      }

      if (b.battlePassPremium === true) {
        progress0.battlePass = progress0.battlePass || {};
        progress0.battlePass.premium = true;
        applied.battlePassPremium = true;
      }

      const hasGrant =
        Object.keys(applied.currencies).length > 0 ||
        applied.materials != null ||
        applied.shards != null ||
        (applied.collection && Object.keys(applied.collection).length > 0) ||
        applied.battlePassPremium;
      if (hasGrant) {
        appendClientNotice(progress0, buildGrantClientMessage(applied));
      }

      const updatedAt = persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);
      return { applied, progress: progress0, updatedAt };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'admin_grant',
      context: applied,
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, applied, progress, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/register', async (req, res) => {
  let identityKey = String(req.body?.identityKey ?? '').trim();
  if (!identityKey) return res.status(400).json({ error: 'Missing identityKey' });
  if (identityKey.length > 128) return res.status(400).json({ error: 'identityKey is too long' });

  const telegramInitData = typeof req.body?.telegramInitData === 'string' ? req.body.telegramInitData : '';
  if (identityKey.startsWith('telegram:')) {
    const verified = verifyTelegramWebAppInitData(telegramInitData);
    if (!verified.ok) {
      return res.status(verified.status).json({ error: verified.error });
    }
    identityKey = `telegram:${verified.user.id}`;
  }

  try {
    const registry = await readPlayersRegistry();
    if (!registry.telegramToPlayer || typeof registry.telegramToPlayer !== 'object') {
      registry.telegramToPlayer = {};
    }
    /** @type {Record<string, number>} */
    const telegramToPlayer = registry.telegramToPlayer;

    const tgFromKey = parseTelegramUserIdFromIdentityKey(identityKey);
    const tgFromBody = normalizeTelegramUserIdFromBody(req.body?.telegramUserId);
    if (tgFromBody != null && !tgFromKey) {
      return res.status(400).json({ error: 'telegramUserId is only accepted with telegram:… identityKey' });
    }
    if (tgFromKey && tgFromBody && tgFromKey !== tgFromBody) {
      return res.status(400).json({ error: 'telegramUserId does not match identityKey' });
    }
    /** @type {string | null} привязка и восстановление только для identity `telegram:userId` */
    const tgForLink = tgFromKey;

    // Для telegram-identity каноничным источником считаем telegramToPlayer.
    // Это чинит кейс рассинхрона, когда identityKey уже существует, но с другим id.
    if (tgForLink && telegramToPlayer[tgForLink] != null) {
      const recoveredId = Math.floor(Number(telegramToPlayer[tgForLink]));
      if (!Number.isFinite(recoveredId) || recoveredId < 1) {
        delete telegramToPlayer[tgForLink];
      } else {
        const existing = registry.players[identityKey];
        registry.players[identityKey] = {
          ...(existing && typeof existing === 'object' ? existing : {}),
          id: recoveredId,
          createdAt:
            existing && typeof existing.createdAt === 'string' && existing.createdAt
              ? existing.createdAt
              : new Date().toISOString(),
          recoveredFromTelegram: true,
        };
        telegramToPlayer[tgForLink] = recoveredId;
        await writePlayersRegistry(registry);
        return res.json({
          id: recoveredId,
          telegramUserId: tgForLink,
          recoveredFromTelegram: true,
        });
      }
    }

    const existing = registry.players[identityKey];
    if (existing?.id) {
      if (tgForLink) telegramToPlayer[tgForLink] = Number(existing.id);
      await writePlayersRegistry(registry);
      const out = { id: Number(existing.id) };
      if (tgForLink != null) out.telegramUserId = tgForLink;
      return res.json(out);
    }

    const id = registry.nextId;
    registry.players[identityKey] = {
      id,
      createdAt: new Date().toISOString(),
    };
    registry.nextId = id + 1;
    if (tgForLink) telegramToPlayer[tgForLink] = id;
    await writePlayersRegistry(registry);

    const out = { id };
    if (tgForLink != null) out.telegramUserId = tgForLink;
    return res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/player/:id/progress', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const registry = await readProgressRegistry();
    const entry = registry[id] ?? null;
    res.json({ progress: entry?.progress ?? null, updatedAt: entry?.updatedAt ?? null });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

function normalizeReferralCode(raw) {
  const s = String(raw ?? '').trim();
  if (!/^[1-9]\d*$/.test(s)) return '';
  return s;
}

function buildReferralSnapshot(playerId, progress) {
  const referrals = normalizeReferrals(progress?.referrals);
  const invitedCount = referrals.invitedPlayers.length;
  return {
    ok: true,
    code: String(playerId),
    invitedBy: referrals.invitedBy,
    invitedCount,
    invitedPlayers: referrals.invitedPlayers,
    inviterClaimedTiers: referrals.inviterClaimedTiers,
    inviteeBonusClaimed: referrals.inviteeBonusClaimed,
    tiers: REFERRAL_INVITER_TIERS.map((tier) => ({
      invites: tier.invites,
      reward: tier.reward,
      claimed: referrals.inviterClaimedTiers.includes(tier.invites),
      available: invitedCount >= tier.invites,
    })),
  };
}

app.get('/api/player/:id/referrals', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });
  try {
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    return res.json(buildReferralSnapshot(id, progress));
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/referrals/bind', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });
  const inviterId = normalizeReferralCode(req.body?.code);
  if (!inviterId) return res.status(400).json({ error: 'Invalid referral code' });
  if (inviterId === id) return res.status(400).json({ error: 'Нельзя использовать свой реферальный код' });

  try {
    const out = await enqueueProgressRwTask(async () => {
      const players = await readPlayersRegistry();
      const inviterExists =
        Object.values(players.players || {}).some((row) => Number(row?.id) === Number(inviterId));
      if (!inviterExists) {
        throw clientHttpError(404, { error: 'Игрок с таким реферальным кодом не найден' });
      }

      const registry = await readProgressRegistry();
      const myProgress = normalizeProgress(registry[id]?.progress);
      myProgress.referrals = normalizeReferrals(myProgress.referrals);
      if (!myProgress.mainHero) {
        throw clientHttpError(409, { error: 'Сначала создай героя, потом привязывай реферальный код' });
      }

      if (myProgress.referrals.invitedBy && myProgress.referrals.invitedBy !== inviterId) {
        throw clientHttpError(409, { error: 'Реферальный код уже привязан к другому игроку' });
      }

      const inviterProgress = normalizeProgress(registry[inviterId]?.progress);
      inviterProgress.referrals = normalizeReferrals(inviterProgress.referrals);
      const inviterSet = new Set(inviterProgress.referrals.invitedPlayers);
      inviterSet.add(String(id));
      inviterProgress.referrals.invitedPlayers = Array.from(inviterSet);

      const firstBind = !myProgress.referrals.invitedBy;
      myProgress.referrals.invitedBy = String(inviterId);
      let inviteeReward = null;
      if (firstBind && !myProgress.referrals.inviteeBonusClaimed) {
        myProgress.referrals.inviteeBonusClaimed = true;
        myProgress.currencies.coins = Math.max(
          0,
          (Number(myProgress.currencies.coins) || 0) + REFERRAL_INVITEE_BONUS.coins,
        );
        myProgress.currencies.crystals = Math.max(
          0,
          (Number(myProgress.currencies.crystals) || 0) + REFERRAL_INVITEE_BONUS.crystals,
        );
        appendClientNotice(
          myProgress,
          `Реферальный бонус: +${REFERRAL_INVITEE_BONUS.coins} монет, +${REFERRAL_INVITEE_BONUS.crystals} кристаллов.`,
        );
        inviteeReward = { ...REFERRAL_INVITEE_BONUS };
      }

      appendClientNotice(
        inviterProgress,
        `Новый реферал #${id}. Доступно приглашений: ${inviterProgress.referrals.invitedPlayers.length}.`,
      );

      const atInviter = persistPlayerProgress(registry, inviterId, inviterProgress);
      const atMe = persistPlayerProgress(registry, id, myProgress);
      await writeProgressRegistry(registry);

      if (inviteeReward) {
        await appendEconomyLog({
          playerId: String(id),
          action: 'referral_invitee_bonus',
          delta: { coins: inviteeReward.coins, crystals: inviteeReward.crystals },
          context: { inviterId: String(inviterId) },
          balanceAfter: myProgress.currencies,
        });
      }

      return {
        progress: myProgress,
        updatedAt: atMe || atInviter || new Date().toISOString(),
        reward: inviteeReward,
        referral: buildReferralSnapshot(id, myProgress),
      };
    });
    return res.json({ ok: true, ...out });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/referrals/claim', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });
  const tierInvites = Math.floor(Number(req.body?.tierInvites));
  if (!Number.isFinite(tierInvites) || tierInvites <= 0) {
    return res.status(400).json({ error: 'tierInvites is required' });
  }
  const tier = REFERRAL_INVITER_TIERS.find((t) => t.invites === tierInvites);
  if (!tier) return res.status(400).json({ error: 'Unknown referral tier' });

  try {
    const out = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress = normalizeProgress(registry[id]?.progress);
      progress.referrals = normalizeReferrals(progress.referrals);
      const invitedCount = progress.referrals.invitedPlayers.length;
      if (invitedCount < tier.invites) {
        throw clientHttpError(409, { error: `Нужно минимум ${tier.invites} приглашений` });
      }
      if (progress.referrals.inviterClaimedTiers.includes(tier.invites)) {
        throw clientHttpError(409, { error: 'Награда за этот порог уже получена' });
      }

      progress.referrals.inviterClaimedTiers.push(tier.invites);
      progress.referrals.inviterClaimedTiers.sort((a, b) => a - b);
      const reward = tier.reward;
      if (reward.coins) progress.currencies.coins = Math.max(0, (Number(progress.currencies.coins) || 0) + reward.coins);
      if (reward.crystals) progress.currencies.crystals = Math.max(0, (Number(progress.currencies.crystals) || 0) + reward.crystals);
      if (reward.gft) progress.currencies.gft = Math.max(0, (Number(progress.currencies.gft) || 0) + reward.gft);
      appendClientNotice(
        progress,
        `Реферальная награда за ${tier.invites} приглашений: +${reward.coins || 0} монет, +${reward.crystals || 0} кристаллов${reward.gft ? `, +${reward.gft} GFT` : ''}.`,
      );

      const updatedAt = persistPlayerProgress(registry, id, progress);
      await writeProgressRegistry(registry);
      await appendEconomyLog({
        playerId: String(id),
        action: 'referral_inviter_claim',
        delta: { ...(reward.coins ? { coins: reward.coins } : {}), ...(reward.crystals ? { crystals: reward.crystals } : {}), ...(reward.gft ? { gft: reward.gft } : {}) },
        context: { tierInvites: tier.invites, invitedCount },
        balanceAfter: progress.currencies,
      });
      return {
        progress,
        updatedAt,
        reward,
        referral: buildReferralSnapshot(id, progress),
      };
    });
    return res.json({ ok: true, ...out });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/client-notices/ack', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
    return res.status(400).json({ error: 'ids: string[] required' });
  }
  if (ids.length > 200) {
    return res.status(400).json({ error: 'Too many ids' });
  }

  try {
    const updatedAt = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress = normalizeProgress(registry[id]?.progress);
      if (Array.isArray(progress.clientNotices) && ids.length) {
        const drop = new Set(ids);
        progress.clientNotices = progress.clientNotices.filter((n) => n && n.id && !drop.has(n.id));
      }
      const at = persistPlayerProgress(registry, id, progress);
      await writeProgressRegistry(registry);
      return at;
    });
    res.json({ ok: true, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/player/:id/nft-bonuses', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });
  const account = String(req.query?.account ?? '').trim();

  try {
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const merged = await getMergedNftBonuses(account, progress.nftSim);
    res.json(merged);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.put('/api/player/:id/progress', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const progress = req.body?.progress;
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return res.status(400).json({ error: 'Missing progress object' });
  }

  try {
    const updatedAt = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const at = new Date().toISOString();
      const previous = registry[id]?.progress;
      const next = { ...progress };
      if (next.nftSim === undefined && previous) {
        const prevN = normalizeProgress(previous);
        next.nftSim = prevN.nftSim;
      }
      if (next.clientNotices === undefined && previous) {
        const prevN = normalizeProgress(previous);
        if (Array.isArray(prevN.clientNotices) && prevN.clientNotices.length) {
          next.clientNotices = prevN.clientNotices;
        }
      } else if (next.clientNotices === undefined) {
        next.clientNotices = [];
      }
      if (next.referrals === undefined && previous) {
        const prevN = normalizeProgress(previous);
        next.referrals = prevN.referrals;
      }
      registry[id] = { progress: normalizeProgress(next), updatedAt: at };
      await writeProgressRegistry(registry);
      return at;
    });
    res.json({ ok: true, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    console.error('[progress] PUT /api/player/:id/progress failed:', id, e?.stack || e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/daily-reward/claim', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const { reward, nftBonuses, progress, updatedAt } = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress0 = normalizeProgress(registry[id]?.progress);
      const today = getTodayKey();
      if (progress0.dailyReward.claimedDate === today) {
        throw clientHttpError(409, { error: 'Daily reward already claimed', claimedDate: today });
      }

      const nftBonuses0 = await getMergedNftBonuses(req.body?.account, progress0.nftSim);
      const reward0 = getDailyReward(nftBonuses0);
      progress0.currencies.coins += reward0.coins;
      progress0.currencies.crystals += reward0.crystals;
      progress0.currencies.gft += reward0.gft;
      progress0.artifacts.materials += reward0.materials;
      progress0.cards.shards += reward0.shards;
      progress0.dailyReward.claimedDate = today;

      const updatedAt0 = persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);
      return { reward: reward0, nftBonuses: nftBonuses0, progress: progress0, updatedAt: updatedAt0 };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'daily_reward_claim',
      delta: {
        gft: reward.gft,
        crystals: reward.crystals,
        coins: reward.coins,
        materials: reward.materials,
        shards: reward.shards,
      },
      context: {
        tier: reward.tier,
        nftHoldBonus: nftBonuses.holdRewardBonus,
        nftGameBonus: nftBonuses.gameRewardBonus,
      },
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, reward, nftBonuses, progress, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/hold/start', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid HOLD amount' });

  try {
    const { hold, nftBonuses, progress, updatedAt } = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress0 = normalizeProgress(registry[id]?.progress);
      const now = Date.now();
      if (progress0.hold.endTime && progress0.hold.lockedGft > 0 && progress0.hold.endTime > now) {
        throw clientHttpError(409, { error: 'HOLD is already active', hold: progress0.hold });
      }
      if (progress0.currencies.gft < amount) {
        throw clientHttpError(400, { error: 'Not enough GFT', available: progress0.currencies.gft });
      }

      const nftBonuses0 = await getMergedNftBonuses(req.body?.account, progress0.nftSim);
      const rewardRate = HOLD_REWARD_RATE * (1 + nftBonuses0.holdRewardBonus);
      progress0.currencies.gft -= amount;
      progress0.hold = {
        endTime: now + HOLD_DURATION_MS,
        lockedGft: amount,
        earnings: 0,
        rewardRate,
      };

      const updatedAt0 = persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);
      return { hold: progress0.hold, nftBonuses: nftBonuses0, progress: progress0, updatedAt: updatedAt0 };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'hold_start',
      delta: { gft: -amount },
      context: {
        lockedGft: amount,
        rewardRate: hold.rewardRate,
        endTime: hold.endTime,
        nftHoldBonus: nftBonuses.holdRewardBonus,
      },
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, hold, nftBonuses, progress, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/hold/claim', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const { reward, hold, progress, updatedAt } = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress0 = normalizeProgress(registry[id]?.progress);
      const now = Date.now();
      if (!progress0.hold.endTime || progress0.hold.lockedGft <= 0) {
        throw clientHttpError(400, { error: 'No active HOLD' });
      }
      if (now < progress0.hold.endTime) {
        throw clientHttpError(400, { error: 'HOLD is not finished yet', hold: progress0.hold });
      }

      const lockedGft = Number(progress0.hold.lockedGft) || 0;
      const rewardRate = Number(progress0.hold.rewardRate) || HOLD_REWARD_RATE;
      const rewardGft = lockedGft * rewardRate;
      progress0.currencies.gft += lockedGft + rewardGft;
      progress0.hold = {
        endTime: null,
        lockedGft: 0,
        earnings: 0,
        rewardRate: HOLD_REWARD_RATE,
      };

      const reward0 = { lockedGft, rewardGft, totalGft: lockedGft + rewardGft };
      const updatedAt0 = persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);
      return { reward: reward0, hold: progress0.hold, progress: progress0, updatedAt: updatedAt0 };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'hold_claim',
      delta: { gft: reward.totalGft },
      context: reward,
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, reward, hold, progress, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/battle/session/start', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const mode = normalizeBattleMode(req.body?.mode);
  const pveContext = mode === 'pve' ? normalizePveContext(req.body?.pveContext) : null;
  const opponent = req.body?.opponent && typeof req.body.opponent === 'object'
    ? {
        id: Math.floor(Number(req.body.opponent.id) || 0),
        name: String(req.body.opponent.name ?? 'Opponent').slice(0, 80),
      }
    : null;

  let pvpOppId = null;
  if (mode === 'pvp') {
    const oppId = String(req.body?.opponentPlayerId ?? '').trim();
    if (!isValidPlayerId(oppId)) {
      return res.status(400).json({ error: 'opponentPlayerId required for PvP' });
    }
    if (oppId === String(id)) {
      return res.status(400).json({ error: 'Cannot PvP yourself' });
    }
    const reg0 = await readProgressRegistry();
    if (!reg0[oppId]) {
      return res.status(400).json({ error: 'Opponent not found' });
    }
    pvpOppId = oppId;
  }

  try {
    const out = await enqueueProgressRwTask(async () => {
      const now = Date.now();
      const cost = battleEnergyCost(mode, pveContext);
      const registry = await readProgressRegistry();
      const progress0 = normalizeProgress(registry[id]?.progress);
      if (!progress0.currencies || typeof progress0.currencies !== 'object') {
        progress0.currencies = { ...createDefaultProgress().currencies };
      }
      const r0 = regenEnergyState(
        progress0.currencies.energy,
        progress0.currencies.energyRegenAt,
        now,
      );
      if (r0.energy < cost) {
        throw clientHttpError(400, {
          error: 'Недостаточно энергии',
          code: 'insufficient_energy',
          energy: r0.energy,
          cost,
          max: MAX_ENERGY,
        });
      }
      const newE = r0.energy - cost;
      let newAt = r0.energyRegenAt;
      if (r0.energy >= MAX_ENERGY && newE < MAX_ENERGY) {
        newAt = now;
      }
      progress0.currencies.energy = newE;
      progress0.currencies.energyRegenAt = newE >= MAX_ENERGY ? now : newAt;
      persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);

      const sessionId = createBattleSessionId();
      let rngSeed = null;
      let pvpOpponentPlayerId = null;
      let pvpOpponentRating = null;
      if (mode === 'pvp' && pvpOppId) {
        const oppProg = normalizeProgress(registry[pvpOppId]?.progress);
        pvpOpponentPlayerId = pvpOppId;
        pvpOpponentRating = Number.isFinite(Number(oppProg.currencies?.rating))
          ? Number(oppProg.currencies.rating)
          : 1000;
        rngSeed = randomBytes(16).toString('hex');
      }

      const sessions = await readBattleSessions();
      pruneBattleSessions(sessions, now);

      const session = {
        id: sessionId,
        playerId: String(id),
        mode,
        pveContext,
        opponent,
        createdAt: now,
        expiresAt: now + BATTLE_SESSION_TTL_MS,
        claimed: false,
        ...(mode === 'pvp'
          ? {
              rngSeed,
              pvpOpponentPlayerId,
              pvpOpponentRating,
            }
          : {}),
      };

      sessions[sessionId] = session;
      await writeBattleSessions(sessions);

      return {
        session,
        energy: {
          current: newE,
          regenAt: progress0.currencies.energyRegenAt,
          cost,
        },
      };
    });
    res.json({ ok: true, session: out.session, energy: out.energy });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/battle/reward', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const sessionId = String(req.body?.sessionId ?? '').trim();
  if (!sessionId) return res.status(400).json({ error: 'Missing battle session id' });

  const requestedMode = normalizeBattleMode(req.body?.mode);
  const result = normalizeBattleResult(req.body?.result);

  try {
    const out = await enqueueProgressRwTask(async () => {
    const sessions = await readBattleSessions();
    const session = sessions[sessionId];
    const now = Date.now();
    if (!session || session.playerId !== String(id)) throw clientHttpError(404, { error: 'Battle session not found' });
    if (session.claimed) throw clientHttpError(409, { error: 'Battle session already claimed' });
    if (Number(session.expiresAt) <= now) {
      delete sessions[sessionId];
      await writeBattleSessions(sessions);
      throw clientHttpError(409, { error: 'Battle session expired' });
    }
    if (session.mode !== requestedMode) throw clientHttpError(400, { error: 'Battle session mode mismatch' });

    const mode = session.mode;
    const pveContext = session.pveContext;
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);

    const clientDeclaredResult = result;
    let effectiveResult = result;
    /** @type {{ movesApplied: number; endedAtMoveIndex: number; roundAtEnd: number } | null} */
    let pvpReplayStats = null;
    if (mode === 'pvp') {
      if (!session.rngSeed || session.pvpOpponentRating == null) {
        throw clientHttpError(500, { error: 'PvP session is missing anti-cheat data' });
      }
      const v = recalculatePvpBattleFromMoves({
        rngSeed: session.rngSeed,
        myProgress: progress,
        opponentRating: session.pvpOpponentRating,
        moves: Array.isArray(req.body?.pvpMoves) ? req.body.pvpMoves : [],
      });
      if (!v.ok) {
        throw clientHttpError(400, { error: v.error || 'PvP verify failed' });
      }
      effectiveResult = v.result;
      pvpReplayStats = v.stats ?? null;
    }

    const nftBonuses = await getMergedNftBonuses(req.body?.account, progress.nftSim);
    const rewardMultiplier = 1 + nftBonuses.gameRewardBonus;
    const rewards = [];
    let rewardModal;
    let economyDelta = { coins: 0, crystals: 0, rating: 0, materials: 0, artifacts: 0 };

    if (mode === 'pve' && pveContext?.isTraining) {
      if (effectiveResult === 'win') {
        const coinReward = Math.round(100 * rewardMultiplier);
        const materialReward = 20;
        progress.currencies.coins += coinReward;
        progress.artifacts.materials += materialReward;
        economyDelta = { coins: coinReward, crystals: 0, rating: 0, materials: materialReward, artifacts: 0 };
        rewards.push(`+${coinReward} монет`, `+${materialReward} материалов`);
        rewardModal = {
          result: effectiveResult,
          title: 'Обучающий бой пройден',
          subtitle: 'Прогресс по главам не меняется. Дальше — настоящие походы в разделе PVE.',
          rewards,
        };
      } else {
        const coinReward = Math.round(40 * rewardMultiplier);
        const materialReward = 8;
        progress.currencies.coins += coinReward;
        progress.artifacts.materials += materialReward;
        economyDelta = { coins: coinReward, crystals: 0, rating: 0, materials: materialReward, artifacts: 0 };
        rewards.push(`+${coinReward} монет`, `+${materialReward} материалов`);
        rewardModal = {
          result: effectiveResult,
          title: 'Поражение в тренировке',
          subtitle: 'Усиль отряд и попробуй снова — это учебный бой, кампания не сдвинута.',
          rewards,
        };
      }
    } else if (mode === 'pve') {
      const chapter = Math.max(1, Math.min(20, Math.floor(Number(pveContext?.chapter) || progress.pve.currentChapter || 1)));
      const level = Math.max(1, Math.min(6, Math.floor(Number(pveContext?.level) || progress.pve.currentLevel || 1)));
      const isBoss = Boolean(pveContext?.isBoss);

      if (effectiveResult === 'win') {
        const coinReward = Math.round((100 * level + (isBoss ? 500 : 0)) * rewardMultiplier);
        const crystalReward = Math.round((isBoss ? 25 : level === 5 ? 8 : 0) * rewardMultiplier);
        const materialFind = Math.max(0, Math.min(300, Number(req.body?.materialFind) || 0));
        const materialReward = Math.round((isBoss ? 50 : 10) * (1 + materialFind / 100));
        const artifact = shouldDropPveArtifact(isBoss) ? createServerPveArtifact(chapter, isBoss) : null;

        progress.currencies.coins += coinReward;
        progress.currencies.crystals += crystalReward;
        progress.artifacts.materials += materialReward;
        if (artifact) progress.artifacts.items.push(artifact);
        economyDelta = { coins: coinReward, crystals: crystalReward, rating: 0, materials: materialReward, artifacts: artifact ? 1 : 0 };

        if (level === 5 && !isBoss) {
          progress.pve.currentLevel = 6;
        } else if (isBoss) {
          progress.pve.currentChapter = Math.min(20, chapter + 1);
          progress.pve.currentLevel = 1;
        } else {
          progress.pve.currentLevel = level + 1;
        }

        rewards.push(`+${coinReward} монет`, ...(crystalReward > 0 ? [`+${crystalReward} кристаллов`] : []), `+${materialReward} материалов`, ...(artifact ? ['+1 артефакт'] : []));
        rewardModal = {
          result: effectiveResult,
          title: isBoss ? 'Босс побеждён 3×3' : 'PVE этап пройден 3×3',
          subtitle: isBoss ? 'Следующая глава разблокирована.' : `Глава ${chapter}-${level} очищена отрядом карт.`,
          rewards,
        };
      } else {
        const coinReward = Math.round(50 * level * rewardMultiplier);
        progress.currencies.coins += coinReward;
        progress.artifacts.materials += 5;
        economyDelta = { coins: coinReward, crystals: 0, rating: 0, materials: 5, artifacts: 0 };
        rewards.push(`+${coinReward} монет`, '+5 материалов');
        rewardModal = {
          result: effectiveResult,
          title: 'PVE отряд повержен',
          subtitle: 'Попробуй усилить карты или героя. Утешительный приз уже начислен.',
          rewards,
        };
      }
    } else if (effectiveResult === 'win') {
      const coinReward = Math.round(200 * rewardMultiplier);
      const crystalReward = Math.round(5 * rewardMultiplier);
      progress.currencies.coins += coinReward;
      progress.currencies.crystals += crystalReward;
      progress.currencies.rating += 10;
      economyDelta = { coins: coinReward, crystals: crystalReward, rating: 10, materials: 0, artifacts: 0 };
      rewards.push(`+${coinReward} монет`, `+${crystalReward} кристаллов`, '+10 рейтинга');
      rewardModal = {
        result: effectiveResult,
        title: 'Победа в карточном бою',
        subtitle: 'Отряд выдержал бой и забирает награды.',
        rewards,
      };
    } else {
      const coinReward = Math.round(60 * rewardMultiplier);
      progress.currencies.coins += coinReward;
      progress.artifacts.materials += 8;
      economyDelta = { coins: coinReward, crystals: 0, rating: 0, materials: 8, artifacts: 0 };
      rewards.push(`+${coinReward} монет`, '+8 материалов');
      rewardModal = {
        result: effectiveResult,
        title: 'Поражение в карточном бою',
        subtitle: 'Отряд получил опыт боя. Забери утешительный приз.',
        rewards,
      };
    }

    if (progress.mainHero && typeof progress.mainHero === 'object') {
      const heroXp = computeBattleHeroXp({ mode, effectiveResult, pveContext: session.pveContext });
      if (heroXp > 0) {
        const { hero, levelUpLines } = applyHeroExpGain(progress.mainHero, heroXp);
        progress.mainHero = hero;
        rewards.push(`+${heroXp} опыта героя`);
        for (const line of levelUpLines) {
          rewards.push(line);
        }
      }
    }

    session.claimed = true;
    session.claimedAt = now;
    const updatedAt = persistPlayerProgress(registry, id, progress);
    pruneBattleSessions(sessions, now);
    await writeProgressRegistry(registry);
    await writeBattleSessions(sessions);
    return {
      rewardModal,
      nftBonuses,
      progress,
      updatedAt,
      economyDelta,
      mode,
      pveContext,
      rewards,
      effectiveResult,
      clientDeclaredResult,
      pvpReplayStats,
    };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'battle_reward',
      delta: out.economyDelta,
      context: {
        sessionId,
        mode: out.mode,
        result: out.effectiveResult,
        pveContext: out.pveContext,
        rewards: out.rewards,
        nftGameBonus: out.nftBonuses.gameRewardBonus,
        ...(out.mode === 'pvp'
          ? {
              pvpReplay: out.pvpReplayStats,
              clientDeclaredResult: out.clientDeclaredResult,
              pvpResultMatch: out.clientDeclaredResult === out.effectiveResult,
            }
          : {}),
      },
      balanceAfter: out.progress.currencies,
    });
    res.json({
      ok: true,
      rewardModal: out.rewardModal,
      nftBonuses: out.nftBonuses,
      progress: out.progress,
      updatedAt: out.updatedAt,
      ...(out.mode === 'pvp'
        ? {
            pvpServerRecalc: true,
            pvpServerResult: out.effectiveResult,
            clientDeclaredResult: out.clientDeclaredResult,
            pvpResultMatch: out.clientDeclaredResult === out.effectiveResult,
            pvpReplayStats: out.pvpReplayStats,
          }
        : {}),
    });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/card-pack/open', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const packType = String(req.body?.packType ?? '');
  const pack = CARD_PACKS[packType];
  if (!pack) return res.status(400).json({ error: 'Invalid card pack type' });

  try {
    const { pack: packResult, progress, updatedAt, payment, costDelta } = await enqueueProgressRwTask(async () => {
      const registry = await readProgressRegistry();
      const progress0 = normalizeProgress(registry[id]?.progress);
      const payment0 = req.body?.payment === 'gft' ? 'gft' : 'default';
      const costDelta0 = { gft: 0, crystals: 0, coins: 0 };

      if (payment0 === 'gft') {
        const cost = GFT_CARD_PACK_COSTS[packType];
        if (!cost) throw clientHttpError(400, { error: 'This pack cannot be bought for GFT' });
        if (progress0.currencies.gft < cost) {
          throw clientHttpError(400, { error: 'Not enough GFT', available: progress0.currencies.gft });
        }
        progress0.currencies.gft -= cost;
        costDelta0.gft = -cost;
      } else if (pack.costCoins != null) {
        if (progress0.currencies.coins < pack.costCoins) {
          throw clientHttpError(400, { error: 'Not enough coins', available: progress0.currencies.coins });
        }
        progress0.currencies.coins -= pack.costCoins;
        costDelta0.coins = -pack.costCoins;
      } else if (pack.costCrystals != null) {
        if (progress0.currencies.crystals < pack.costCrystals) {
          throw clientHttpError(400, { error: 'Not enough crystals', available: progress0.currencies.crystals });
        }
        progress0.currencies.crystals -= pack.costCrystals;
        costDelta0.crystals = -pack.costCrystals;
      }

      const pack0 = grantCardPack(progress0, packType, await getCardCatalog());
      const updatedAt0 = persistPlayerProgress(registry, id, progress0);
      await writeProgressRegistry(registry);
      return { pack: pack0, progress: progress0, updatedAt: updatedAt0, payment: payment0, costDelta: costDelta0 };
    });
    await appendEconomyLog({
      playerId: String(id),
      action: 'card_pack_open',
      delta: {
        ...costDelta,
        shards: packResult.results.reduce((sum, r) => sum + r.shards, 0),
        cards: packResult.results.length,
      },
      context: {
        packType,
        packName: packResult.packName,
        payment,
        cards: packResult.results,
      },
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, pack: packResult, progress, updatedAt });
  } catch (e) {
    if (e?.clientHttp) return res.status(e.status).json(e.body);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/xrpl/account/:account/nft-bonuses', async (req, res) => {
  const account = String(req.params.account ?? '').trim();
  if (!isValidXrplAccount(account)) return res.status(400).json({ error: 'Invalid XRPL account' });

  try {
    res.json(await getNftBonusesForAccount(account));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Create a SignIn payload (Xaman will return the XRPL account when signed).
app.post('/api/xaman/signin', async (_req, res) => {
  if (!xumm) return res.status(500).json({ error: 'Xaman backend not configured (missing XUMM_API_KEY/XUMM_API_SECRET).' });

  try {
    const payload = await xumm.payload?.create({
      txjson: {
        TransactionType: 'SignIn',
      },
      options: {
        expire: 10 * 60,
        return_url: {
          app: 'xumm://xumm.app/detect/xapp:signin',
          web: FRONTEND_ORIGIN_PRIMARY,
        },
      },
    });

    res.json({
      uuid: payload.uuid,
      next: payload.next,
      refs: payload.refs,
      pushed: payload.pushed,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Poll payload status to find signed account.
app.get('/api/xaman/payload/:uuid', async (req, res) => {
  if (!xumm) return res.status(500).json({ error: 'Xaman backend not configured (missing XUMM_API_KEY/XUMM_API_SECRET).' });

  try {
    const { uuid } = req.params;
    const status = await xumm.payload?.get(uuid, true);
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// --- Магазин: список паков см. `/api/shop/coin-packs` выше. XRP — только монеты через Xaman. TON — /api/shop/coins/ton/*. GFT on-chain — /api/gft/deposit. ---

app.post('/api/shop/coins/purchase-xrp', async (req, res) => {
  if (!xumm) return res.status(503).json({ error: 'Xaman not configured' });
  if (!TREASURY_XRPL_ADDRESS) return res.status(503).json({ error: 'TREASURY_XRPL_ADDRESS not set' });

  const playerId = String(req.body?.playerId ?? '');
  if (!isValidPlayerId(playerId)) return res.status(400).json({ error: 'Invalid player id' });
  const packId = String(req.body?.packId ?? '').trim();
  const pack = getXrpPackOrNull(packId);
  if (!pack) return res.status(400).json({ error: 'Invalid pack' });

  try {
    const payload = await xumm.payload?.create({
      txjson: {
        TransactionType: 'Payment',
        Destination: TREASURY_XRPL_ADDRESS,
        Amount: String(pack.drops),
      },
      custom_meta: {
        instruction: `GFT Arena: ${pack.coins} coins for ${pack.label}`,
        playerId: String(playerId),
        packId: String(packId),
      },
      options: {
        expire: 12 * 60,
        return_url: {
          web: FRONTEND_ORIGIN_PRIMARY,
        },
      },
    });
    const uuid = payload.uuid;
    const pending = await readXrpPendingFile(DATA_DIR);
    pending[uuid] = { playerId, packId, drops: pack.drops, coins: pack.coins, at: new Date().toISOString() };
    await writeXrpPendingFile(DATA_DIR, pending);

    res.json({
      uuid: payload.uuid,
      next: payload.next,
      refs: payload.refs,
      pushed: payload.pushed,
      drops: pack.drops,
      coins: pack.coins,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/shop/coins/purchase-xrp/:uuid/verify', async (req, res) => {
  if (!xumm) return res.status(503).json({ error: 'Xaman not configured' });
  if (!TREASURY_XRPL_ADDRESS) return res.status(503).json({ error: 'TREASURY_XRPL_ADDRESS not set' });

  const { uuid } = req.params;
  const playerId = String(req.query?.playerId ?? '');
  if (!isValidPlayerId(playerId)) return res.status(400).json({ error: 'Invalid player id' });

  const pending = await readXrpPendingFile(DATA_DIR);
  const slot = pending[uuid];
  if (!slot || slot.playerId !== playerId) {
    return res.status(400).json({ error: 'Unknown or expired purchase session' });
  }

  try {
    const payload = await xumm.payload?.get(uuid, true);
    if (!payload?.meta?.resolved) return res.json({ status: 'pending' });
    if (payload?.meta?.cancelled) return res.json({ status: 'cancelled' });
    if (payload?.meta?.expired) return res.json({ status: 'expired' });
    if (!payload?.meta?.signed) return res.json({ status: 'not_signed' });

    const txid = payload?.response?.txid;
    if (!txid) return res.status(500).json({ error: 'Missing txid' });

    const client = new Client(XRPL_WS);
    await client.connect();
    let tx;
    try {
      tx = await client.request({ command: 'tx', transaction: txid });
    } finally {
      await client.disconnect();
    }
    if (tx.result.validated !== true) return res.json({ status: 'submitted' });

    if (tx.result.TransactionType !== 'Payment') {
      console.warn('[shop/xrp] invalid tx:', {
        reason: 'not_payment',
        txid,
        type: tx.result.TransactionType,
      });
      return res.json({ status: 'invalid', reason: 'not_payment', txType: tx.result.TransactionType });
    }
    if (tx.result.Destination !== TREASURY_XRPL_ADDRESS) {
      console.warn('[shop/xrp] invalid tx:', {
        reason: 'wrong_dest',
        txid,
        dest: tx.result.Destination,
        expected: TREASURY_XRPL_ADDRESS,
      });
      return res.json({
        status: 'invalid',
        reason: 'wrong_dest',
        dest: tx.result.Destination,
        expectedDest: TREASURY_XRPL_ADDRESS,
      });
    }
    const amt = tx.result.Amount;
    if (typeof amt !== 'string' || BigInt(amt) !== BigInt(slot.drops)) {
      console.warn('[shop/xrp] invalid tx:', {
        reason: 'wrong_amount',
        txid,
        amount: amt,
        expectedDrops: String(slot.drops),
      });
      return res.json({
        status: 'invalid',
        reason: 'wrong_amount',
        amount: typeof amt === 'string' ? amt : null,
        expectedDrops: String(slot.drops),
      });
    }

    const out = await enqueueProgressRwTask(async () => {
      const credited = await readCreditedFile(DATA_DIR);
      if (credited.xrpl.includes(txid)) {
        return { type: 'dup' };
      }
      const registry = await readProgressRegistry();
      const progress = normalizeProgress(registry[playerId]?.progress);
      progress.currencies.coins = Math.max(0, (Number(progress.currencies.coins) || 0) + slot.coins);
      const updatedAt = persistPlayerProgress(registry, playerId, progress);
      await writeProgressRegistry(registry);
      credited.xrpl.push(txid);
      if (credited.xrpl.length > 20_000) {
        credited.xrpl = credited.xrpl.slice(-15_000);
      }
      await writeCreditedFile(DATA_DIR, credited);
      return { type: 'ok', progress, updatedAt, coins: slot.coins, txid };
    });

    if (out.type === 'dup') {
      const nextP = { ...pending };
      delete nextP[uuid];
      await writeXrpPendingFile(DATA_DIR, nextP);
      return res.json({ status: 'already_credited', txid });
    }

    const nextP = { ...pending };
    delete nextP[uuid];
    await writeXrpPendingFile(DATA_DIR, nextP);

    await appendEconomyLog({
      playerId: String(playerId),
      action: 'shop_coins_xrp',
      delta: { coins: out.coins },
      context: { packId: slot.packId, txid, drops: slot.drops, chain: 'xrpl' },
      balanceAfter: out.progress.currencies,
    });
    return res.json({
      status: 'credited',
      coins: out.coins,
      txid: out.txid,
      progress: out.progress,
      updatedAt: out.updatedAt,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/shop/coins/ton/transaction', (req, res) => {
  if (!TON_TREASURY_ADDRESS) {
    return res.status(503).json({ error: 'TON_TREASURY_ADDRESS not set' });
  }
  const playerId = String(req.body?.playerId ?? '');
  if (!isValidPlayerId(playerId)) return res.status(400).json({ error: 'Invalid player id' });
  const packId = String(req.body?.packId ?? '').trim();
  const offer = getTonOfferOrNull(packId);
  if (!offer) return res.status(400).json({ error: 'Invalid TON offer' });

  const validUntil = Math.floor(Date.now() / 1000) + 12 * 60;
  return res.json({
    ok: true,
    validUntil,
    messages: [
      {
        address: TON_TREASURY_ADDRESS,
        amount: offer.nanos.toString(),
      },
    ],
    packId,
    effect: offer.effect,
  });
});

app.post('/api/shop/coins/ton/verify', async (req, res) => {
  if (!TON_TREASURY_ADDRESS) {
    return res.status(503).json({ error: 'TON_TREASURY_ADDRESS not set' });
  }
  const playerId = String(req.body?.playerId ?? '');
  if (!isValidPlayerId(playerId)) return res.status(400).json({ error: 'Invalid player id' });
  const boc = String(req.body?.boc ?? '').trim();
  if (boc.length < 20) return res.status(400).json({ error: 'Invalid boc' });

  const idem = bocHashId(boc);
  const nano = findInternalNanoToAddress(boc, TON_TREASURY_ADDRESS);
  if (nano == null) {
    return res.status(400).json({ error: 'Could not find TON transfer to treasury in boc' });
  }
  const match = getTonOfferByReceivedNanos(nano);
  if (!match) {
    return res.status(400).json({ error: 'Amount does not match any TON offer (GFT for TON is not sold)' });
  }

  if (TON_ONCHAIN_VERIFY) {
    let msgHashBase64;
    try {
      msgHashBase64 = bocRootMessageHashBase64(boc);
    } catch {
      return res.status(400).json({ error: 'Invalid TON boc format' });
    }
    // Индексация блоков может отставать на несколько секунд — делаем короткие ретраи.
    let verified = null;
    for (let i = 0; i < 6; i++) {
      const r = await verifyTonTransferOnchainByMessageHash({
        messageHashBase64: msgHashBase64,
        treasuryAddress: TON_TREASURY_ADDRESS,
        expectedNanos: match.nanos,
        tonApiBaseUrl: TON_API_BASE_URL,
        tonApiKey: TON_API_KEY,
        timeoutMs: 9_000,
      });
      if (r.ok) {
        verified = r;
        break;
      }
      // Для "ещё не найдено" подождём; для явной ошибки API — выходим сразу.
      if (r.reason === 'ton_api_error') {
        return res.status(503).json({ error: `TON API unavailable: ${r.detail || 'temporary failure'}` });
      }
      if (r.reason === 'payment_not_matched') {
        return res.status(400).json({ error: 'TON payment does not match treasury/amount requirements' });
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    if (!verified) {
      return res.status(409).json({ error: 'TON transaction is not confirmed on-chain yet. Try again in a few seconds.' });
    }
  }

  const eff = match.effect;

  try {
    const out = await enqueueProgressRwTask(async () => {
      const credited = await readCreditedFile(DATA_DIR);
      if (credited.ton.includes(idem)) {
        return { type: 'dup' };
      }
      const registry = await readProgressRegistry();
      const progress = normalizeProgress(registry[playerId]?.progress);
      if (eff.type === 'battlepass' && progress.battlePass?.premium) {
        return { type: 'already_premium' };
      }

      let grant;
      if (eff.type === 'coins') {
        progress.currencies.coins = Math.max(0, (Number(progress.currencies.coins) || 0) + eff.amount);
        grant = { type: 'coins', amount: eff.amount };
      } else if (eff.type === 'crystals') {
        progress.currencies.crystals = Math.max(0, (Number(progress.currencies.crystals) || 0) + eff.amount);
        grant = { type: 'crystals', amount: eff.amount };
      } else if (eff.type === 'cardPack') {
        const pr = grantCardPack(progress, eff.packType, await getCardCatalog());
        grant = { type: 'pack', packType: eff.packType, packName: pr.packName, results: pr.results };
      } else if (eff.type === 'battlepass') {
        progress.battlePass = progress.battlePass || {};
        progress.battlePass.premium = true;
        grant = { type: 'battlepass' };
      } else {
        return { type: 'unknown_effect' };
      }

      const updatedAt = persistPlayerProgress(registry, playerId, progress);
      await writeProgressRegistry(registry);
      credited.ton.push(idem);
      if (credited.ton.length > 50_000) {
        credited.ton = credited.ton.slice(-35_000);
      }
      await writeCreditedFile(DATA_DIR, credited);
      return { type: 'ok', progress, updatedAt, grant, offerId: match.id, nanos: match.nanos.toString() };
    });

    if (out.type === 'dup') {
      return res.json({ status: 'already_credited' });
    }
    if (out.type === 'already_premium') {
      return res.status(400).json({ error: 'Премиум Battle Pass уже открыт' });
    }
    if (out.type === 'unknown_effect') {
      return res.status(500).json({ error: 'Invalid offer effect' });
    }

    const ecoDelta = {};
    const ctx = { offerId: out.offerId, bocId: idem, nanos: out.nanos, chain: 'ton' };
    if (out.grant.type === 'coins') ecoDelta.coins = out.grant.amount;
    if (out.grant.type === 'crystals') ecoDelta.crystals = out.grant.amount;
    if (out.grant.type === 'pack') {
      ecoDelta.shards = out.grant.results?.reduce((s, r) => s + (r.shards || 0), 0) ?? 0;
      ecoDelta.cards = out.grant.results?.length ?? 0;
      ctx.pack = out.grant.packName;
    }
    if (out.grant.type === 'battlepass') {
      ecoDelta.battlePassPremium = true;
    }

    await appendEconomyLog({
      playerId: String(playerId),
      action: 'shop_ton',
      delta: ecoDelta,
      context: { ...ctx, grant: out.grant },
      balanceAfter: out.progress.currencies,
    });
    return res.json({
      status: 'credited',
      progress: out.progress,
      updatedAt: out.updatedAt,
      grant: out.grant,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Create a deposit payload: user pays GFT (issued currency) to treasury.
app.post('/api/gft/deposit', async (req, res) => {
  if (!xumm) return res.status(500).json({ error: 'Xaman backend not configured (missing XUMM_API_KEY/XUMM_API_SECRET).' });
  if (!TREASURY_XRPL_ADDRESS) return res.status(500).json({ error: 'Treasury address not configured (missing TREASURY_XRPL_ADDRESS).' });
  if (!GFT_ISSUER) return res.status(500).json({ error: 'GFT issuer not configured (missing GFT_ISSUER).' });

  const amount = String(req.body?.amount ?? '').trim();
  const account = String(req.body?.account ?? '').trim();
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Invalid amount' });
  // keep a sane range for demo
  if (value > 1_000_000) return res.status(400).json({ error: 'Amount too large' });
  if (!isValidXrplAccount(account)) {
    return res.status(400).json({ error: 'Connect Xaman first: account is required' });
  }

  try {
    const precheck = await checkGftTrustlineAndBalance(account, value);
    if (!precheck.ok) {
      if (precheck.reason === 'no_trustline') {
        return res.status(409).json({
          error: `No trustline for ${GFT_CURRENCY}.${GFT_ISSUER}. Add trustline in Xaman first.`,
        });
      }
      if (precheck.reason === 'insufficient_balance') {
        return res.status(409).json({
          error: `Insufficient ${GFT_CURRENCY} balance. Available: ${precheck.balance ?? 0}, required: ${value}.`,
        });
      }
      return res.status(400).json({ error: 'GFT precheck failed' });
    }

    const payload = await xumm.payload?.create({
      txjson: {
        TransactionType: 'Payment',
        Account: account,
        Destination: TREASURY_XRPL_ADDRESS,
        Amount: {
          currency: GFT_CURRENCY,
          issuer: GFT_ISSUER,
          value: String(value),
        },
      },
      custom_meta: {
        instruction: `Deposit ${value} ${GFT_CURRENCY}`,
      },
      options: {
        expire: 10 * 60,
        return_url: {
          web: FRONTEND_ORIGIN_PRIMARY,
        },
      },
    });

    res.json({
      uuid: payload.uuid,
      next: payload.next,
      refs: payload.refs,
      pushed: payload.pushed,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Verify that the signed payload resulted in the expected on-ledger GFT payment to treasury.
app.get('/api/gft/deposit/:uuid/verify', async (req, res) => {
  if (!xumm) return res.status(500).json({ error: 'Xaman backend not configured (missing XUMM_API_KEY/XUMM_API_SECRET).' });
  if (!TREASURY_XRPL_ADDRESS) return res.status(500).json({ error: 'Treasury address not configured (missing TREASURY_XRPL_ADDRESS).' });
  if (!GFT_ISSUER) return res.status(500).json({ error: 'GFT issuer not configured (missing GFT_ISSUER).' });

  const { uuid } = req.params;

  try {
    const payload = await xumm.payload?.get(uuid, true);
    if (!payload?.meta?.resolved) return res.json({ status: 'pending' });
    if (payload?.meta?.cancelled) return res.json({ status: 'cancelled' });
    if (payload?.meta?.expired) return res.json({ status: 'expired' });
    if (!payload?.meta?.signed) return res.json({ status: 'not_signed' });

    const txid = payload?.response?.txid;
    const account = payload?.response?.account;
    if (!txid) return res.status(500).json({ error: 'Missing txid in payload response' });

    const client = new Client(XRPL_WS);
    await client.connect();
    try {
      const tx = await client.request({
        command: 'tx',
        transaction: txid,
      });
      if (tx.result.validated !== true) return res.json({ status: 'submitted', txid, account });
      if (tx.result.TransactionType !== 'Payment') return res.json({ status: 'invalid', reason: 'Not a Payment', txid, account });
      if (tx.result.Destination !== TREASURY_XRPL_ADDRESS) return res.json({ status: 'invalid', reason: 'Wrong destination', txid, account });

      const amt = tx.result.Amount;
      if (typeof amt !== 'object' || !amt) return res.json({ status: 'invalid', reason: 'Not an issued-currency payment', txid, account });
      if (amt.currency !== GFT_CURRENCY || amt.issuer !== GFT_ISSUER) {
        return res.json({ status: 'invalid', reason: 'Wrong currency/issuer', txid, account });
      }

      res.json({
        status: 'credited',
        account,
        txid,
        amount: amt.value,
        currency: amt.currency,
        issuer: amt.issuer,
      });
    } finally {
      await client.disconnect();
    }
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.use(
  express.static(DIST_DIR, {
    fallthrough: true,
    index: false,
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (base === 'index.html') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

const SETUP_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>GFT Arena — собери фронтенд</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        font-family: 'Inter', system-ui, sans-serif; color: #e2e8f0;
        background: radial-gradient(circle at 30% 20%, #312e81 0%, #0f172a 55%, #020617 100%); }
      .card { width: min(520px, 92vw); padding: 28px 30px; background: rgba(15,23,42,0.85);
        border: 1px solid rgba(165,180,252,0.4); border-radius: 20px;
        box-shadow: 0 0 40px rgba(124,58,237,0.35); text-align: left; }
      h1 { margin: 0 0 12px; font-size: 22px; color: #facc15; letter-spacing: 0.06em; }
      p { margin: 0 0 14px; color: #cbd5e1; line-height: 1.5; font-size: 14px; }
      code { background: rgba(2,6,23,0.7); padding: 2px 8px; border-radius: 6px;
        color: #a5b4fc; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 13px; }
      pre { background: rgba(2,6,23,0.85); border: 1px solid rgba(165,180,252,0.25);
        border-radius: 12px; padding: 14px 16px; color: #c4b5fd; font-size: 13px;
        overflow: auto; }
      a { color: #facc15; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>GFT ARENA · билда нет</h1>
      <p>API сервер запущен, но папка <code>dist/</code> ещё не собрана. Из-за этого фронт игры не отдаётся, и ngrok видит 404.</p>
      <p>Запусти билд и перезапусти сервер (или просто пересобери — статика подхватится автоматически):</p>
      <pre>npm run build
npm run dev:server</pre>
      <p>Для разработки с горячей перезагрузкой используй <code>npm run dev:all</code> и направь ngrok на порт <code>5173</code>.</p>
    </div>
  </body>
</html>`;

// Не подменяем index.html на запросы к /assets/*: иначе бандлы «ломаются» и в логах виден не тот статус.
app.get(/^(?!\/api\/)(?!\/assets\/)/, (_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexPath);
  } else {
    res.status(503).type('html').send(SETUP_HTML);
  }
});

app.use((err, req, res, _next) => {
  if (res.headersSent) return;
  console.error('[http]', req.method, req.url, err?.stack || err);
  res.status(500).type('text/plain').send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  if (existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('Serving built frontend from dist/.');
  } else {
    console.log('dist/ not found. Showing setup page on non-API routes. Run "npm run build" to serve the game.');
  }
});

