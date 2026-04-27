import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { XummSdk } from 'xumm-sdk';
import { Client } from 'xrpl';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
const GFT_CURRENCY = process.env.GFT_CURRENCY || 'GFT';
const GFT_ISSUER = process.env.GFT_ISSUER;
const GFT_NFT_ISSUER = 'r9ex7ywp4JdFGfZeS6AYXxc4AJkN4UN1Jw';
const HOLD_DURATION_MS = 6 * 60 * 60 * 1000;
const HOLD_REWARD_RATE = 0.02;
const MAX_ENERGY = 100;
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
if (!GFT_ISSUER) {
  console.warn('Missing GFT_ISSUER in environment.');
}

const xumm = XUMM_API_KEY && XUMM_API_SECRET ? new XummSdk(XUMM_API_KEY, XUMM_API_SECRET) : null;

async function readPlayersRegistry() {
  try {
    const raw = await readFile(PLAYERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      nextId: Number(parsed.nextId) > 0 ? Number(parsed.nextId) : 1,
      players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
    };
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e;
    return { nextId: 1, players: {} };
  }
}

async function writePlayersRegistry(registry) {
  await mkdir(DATA_DIR, { recursive: true });
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
      await mkdir(DATA_DIR, { recursive: true });
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
  await mkdir(DATA_DIR, { recursive: true });
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
  await mkdir(DATA_DIR, { recursive: true });
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
      await mkdir(DATA_DIR, { recursive: true });
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
  await mkdir(DATA_DIR, { recursive: true });
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
    await mkdir(DATA_DIR, { recursive: true });
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
      energy: 100,
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
    savedAt: new Date().toISOString(),
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

/**
 * PVP: список реальных игроков с прогрессом, ближайших по рейтингу (для выбора соперника).
 */
app.get('/api/arena/pvp-opponents', async (req, res) => {
  const myId = String(req.query.playerId ?? '').trim();
  if (!isValidPlayerId(myId)) {
    return res.status(400).json({ error: 'Query playerId is required' });
  }
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
      const absDiff = Math.abs(ratingN - myRating);
      candidates.push({ playerId: pid, name, rating: ratingN, power, maxHP, absDiff });
    }
    candidates.sort((a, b) => a.absDiff - b.absDiff || b.rating - a.rating);
    const slice = candidates.slice(0, 12).map(({ absDiff, ...row }) => row);
    res.json({ ok: true, myRating, count: slice.length, opponents: slice });
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
    const registry = await readProgressRegistry();
    const ids = Object.keys(registry).filter(isValidPlayerId);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const picked = ids.slice(0, Math.min(sampleSize, ids.length));
    const results = [];

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
      results.push({ playerId: pid, nftSim: progress.nftSim, updatedAt });
    }

    await writeProgressRegistry(registry);
    for (const row of results) {
      await appendEconomyLog({
        playerId: String(row.playerId),
        action: 'nft_sim_random_grant',
        context: row.nftSim,
      });
    }

    res.json({ ok: true, includeGenesis, count: results.length, results });
  } catch (e) {
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
    const registry = await readProgressRegistry();
    if (!registry[id]) {
      registry[id] = { progress: null, updatedAt: null };
    }
    const progress = normalizeProgress(registry[id].progress);
    const applied = { currencies: {}, materials: null, shards: null, collection: {}, battlePassPremium: null };

    const cur = progress.currencies;
    const currencyKeys = ['gft', 'crystals', 'coins', 'rating', 'energy'];
    if (b.currencies && typeof b.currencies === 'object') {
      for (const k of currencyKeys) {
        if (b.currencies[k] === undefined) continue;
        const d = Math.floor(Number(b.currencies[k]));
        if (!Number.isFinite(d)) {
          return res.status(400).json({ error: `Invalid currencies.${k}` });
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
      if (!Number.isFinite(d)) return res.status(400).json({ error: 'Invalid materials' });
      progress.artifacts.materials = Math.max(0, (Number(progress.artifacts.materials) || 0) + d);
      applied.materials = d;
    }

    if (b.shards !== undefined) {
      const d = Math.floor(Number(b.shards));
      if (!Number.isFinite(d)) return res.status(400).json({ error: 'Invalid shards' });
      progress.cards.shards = Math.max(0, (Number(progress.cards.shards) || 0) + d);
      applied.shards = d;
    }

    if (b.collection && typeof b.collection === 'object') {
      if (!progress.cards.collection) progress.cards.collection = {};
      for (const [cardId, raw] of Object.entries(b.collection)) {
        if (!/^[a-z0-9_-]{1,80}$/i.test(cardId)) {
          return res.status(400).json({ error: `Invalid card id: ${cardId}` });
        }
        const d = Math.floor(Number(raw));
        if (!Number.isFinite(d) || d < 0) {
          return res.status(400).json({ error: `Invalid collection count: ${cardId}` });
        }
        progress.cards.collection[cardId] = (Number(progress.cards.collection[cardId]) || 0) + d;
        applied.collection[cardId] = d;
      }
    }

    if (b.battlePassPremium === true) {
      progress.battlePass = progress.battlePass || {};
      progress.battlePass.premium = true;
      applied.battlePassPremium = true;
    }

    const hasGrant =
      Object.keys(applied.currencies).length > 0 ||
      applied.materials != null ||
      applied.shards != null ||
      (applied.collection && Object.keys(applied.collection).length > 0) ||
      applied.battlePassPremium;
    if (hasGrant) {
      appendClientNotice(progress, buildGrantClientMessage(applied));
    }

    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
    await appendEconomyLog({
      playerId: String(id),
      action: 'admin_grant',
      context: applied,
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, applied, progress, updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/register', async (req, res) => {
  const identityKey = String(req.body?.identityKey ?? '').trim();
  if (!identityKey) return res.status(400).json({ error: 'Missing identityKey' });
  if (identityKey.length > 128) return res.status(400).json({ error: 'identityKey is too long' });

  try {
    const registry = await readPlayersRegistry();
    const existing = registry.players[identityKey];
    if (existing?.id) {
      return res.json({ id: existing.id });
    }

    const id = registry.nextId;
    registry.players[identityKey] = {
      id,
      createdAt: new Date().toISOString(),
    };
    registry.nextId = id + 1;
    await writePlayersRegistry(registry);

    res.json({ id });
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
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    if (Array.isArray(progress.clientNotices) && ids.length) {
      const drop = new Set(ids);
      progress.clientNotices = progress.clientNotices.filter((n) => n && n.id && !drop.has(n.id));
    }
    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
    res.json({ ok: true, updatedAt });
  } catch (e) {
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
    const registry = await readProgressRegistry();
    const updatedAt = new Date().toISOString();
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
    registry[id] = { progress: normalizeProgress(next), updatedAt };
    await writeProgressRegistry(registry);
    res.json({ ok: true, updatedAt });
  } catch (e) {
    console.error('[progress] PUT /api/player/:id/progress failed:', id, e?.stack || e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/daily-reward/claim', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const today = getTodayKey();
    if (progress.dailyReward.claimedDate === today) {
      return res.status(409).json({ error: 'Daily reward already claimed', claimedDate: today });
    }

    const nftBonuses = await getMergedNftBonuses(req.body?.account, progress.nftSim);
    const reward = getDailyReward(nftBonuses);
    progress.currencies.coins += reward.coins;
    progress.currencies.crystals += reward.crystals;
    progress.currencies.gft += reward.gft;
    progress.artifacts.materials += reward.materials;
    progress.cards.shards += reward.shards;
    progress.dailyReward.claimedDate = today;

    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
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
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/hold/start', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid HOLD amount' });

  try {
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const now = Date.now();
    if (progress.hold.endTime && progress.hold.lockedGft > 0 && progress.hold.endTime > now) {
      return res.status(409).json({ error: 'HOLD is already active', hold: progress.hold });
    }
    if (progress.currencies.gft < amount) {
      return res.status(400).json({ error: 'Not enough GFT', available: progress.currencies.gft });
    }

    const nftBonuses = await getMergedNftBonuses(req.body?.account, progress.nftSim);
    const rewardRate = HOLD_REWARD_RATE * (1 + nftBonuses.holdRewardBonus);
    progress.currencies.gft -= amount;
    progress.hold = {
      endTime: now + HOLD_DURATION_MS,
      lockedGft: amount,
      earnings: 0,
      rewardRate,
    };

    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
    await appendEconomyLog({
      playerId: String(id),
      action: 'hold_start',
      delta: { gft: -amount },
      context: {
        lockedGft: amount,
        rewardRate,
        endTime: progress.hold.endTime,
        nftHoldBonus: nftBonuses.holdRewardBonus,
      },
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, hold: progress.hold, nftBonuses, progress, updatedAt });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/player/:id/hold/claim', async (req, res) => {
  const { id } = req.params;
  if (!isValidPlayerId(id)) return res.status(400).json({ error: 'Invalid player id' });

  try {
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const now = Date.now();
    if (!progress.hold.endTime || progress.hold.lockedGft <= 0) return res.status(400).json({ error: 'No active HOLD' });
    if (now < progress.hold.endTime) return res.status(400).json({ error: 'HOLD is not finished yet', hold: progress.hold });

    const lockedGft = Number(progress.hold.lockedGft) || 0;
    const rewardRate = Number(progress.hold.rewardRate) || HOLD_REWARD_RATE;
    const rewardGft = lockedGft * rewardRate;
    progress.currencies.gft += lockedGft + rewardGft;
    progress.hold = {
      endTime: null,
      lockedGft: 0,
      earnings: 0,
      rewardRate: HOLD_REWARD_RATE,
    };

    const reward = { lockedGft, rewardGft, totalGft: lockedGft + rewardGft };
    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
    await appendEconomyLog({
      playerId: String(id),
      action: 'hold_claim',
      delta: { gft: reward.totalGft },
      context: reward,
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, reward, hold: progress.hold, progress, updatedAt });
  } catch (e) {
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

  try {
    const now = Date.now();
    const sessions = await readBattleSessions();
    pruneBattleSessions(sessions, now);

    const sessionId = createBattleSessionId();
    const session = {
      id: sessionId,
      playerId: String(id),
      mode,
      pveContext,
      opponent,
      createdAt: now,
      expiresAt: now + BATTLE_SESSION_TTL_MS,
      claimed: false,
    };

    sessions[sessionId] = session;
    await writeBattleSessions(sessions);
    res.json({ ok: true, session });
  } catch (e) {
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
    const sessions = await readBattleSessions();
    const session = sessions[sessionId];
    const now = Date.now();
    if (!session || session.playerId !== String(id)) return res.status(404).json({ error: 'Battle session not found' });
    if (session.claimed) return res.status(409).json({ error: 'Battle session already claimed' });
    if (Number(session.expiresAt) <= now) {
      delete sessions[sessionId];
      await writeBattleSessions(sessions);
      return res.status(409).json({ error: 'Battle session expired' });
    }
    if (session.mode !== requestedMode) return res.status(400).json({ error: 'Battle session mode mismatch' });

    const mode = session.mode;
    const pveContext = session.pveContext;
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const nftBonuses = await getMergedNftBonuses(req.body?.account, progress.nftSim);
    const rewardMultiplier = 1 + nftBonuses.gameRewardBonus;
    const rewards = [];
    let rewardModal;
    let economyDelta = { coins: 0, crystals: 0, rating: 0, materials: 0, artifacts: 0 };

    if (mode === 'pve' && pveContext?.isTraining) {
      if (result === 'win') {
        const coinReward = Math.round(100 * rewardMultiplier);
        const materialReward = 20;
        progress.currencies.coins += coinReward;
        progress.artifacts.materials += materialReward;
        economyDelta = { coins: coinReward, crystals: 0, rating: 0, materials: materialReward, artifacts: 0 };
        rewards.push(`+${coinReward} монет`, `+${materialReward} материалов`);
        rewardModal = {
          result,
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
          result,
          title: 'Поражение в тренировке',
          subtitle: 'Усиль отряд и попробуй снова — это учебный бой, кампания не сдвинута.',
          rewards,
        };
      }
    } else if (mode === 'pve') {
      const chapter = Math.max(1, Math.min(20, Math.floor(Number(pveContext?.chapter) || progress.pve.currentChapter || 1)));
      const level = Math.max(1, Math.min(6, Math.floor(Number(pveContext?.level) || progress.pve.currentLevel || 1)));
      const isBoss = Boolean(pveContext?.isBoss);

      if (result === 'win') {
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
          result,
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
          result,
          title: 'PVE отряд повержен',
          subtitle: 'Попробуй усилить карты или героя. Утешительный приз уже начислен.',
          rewards,
        };
      }
    } else if (result === 'win') {
      const coinReward = Math.round(200 * rewardMultiplier);
      const crystalReward = Math.round(5 * rewardMultiplier);
      progress.currencies.coins += coinReward;
      progress.currencies.crystals += crystalReward;
      progress.currencies.rating += 10;
      economyDelta = { coins: coinReward, crystals: crystalReward, rating: 10, materials: 0, artifacts: 0 };
      rewards.push(`+${coinReward} монет`, `+${crystalReward} кристаллов`, '+10 рейтинга');
      rewardModal = {
        result,
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
        result,
        title: 'Поражение в карточном бою',
        subtitle: 'Отряд получил опыт боя. Забери утешительный приз.',
        rewards,
      };
    }

    session.claimed = true;
    session.claimedAt = now;
    const updatedAt = persistPlayerProgress(registry, id, progress);
    pruneBattleSessions(sessions, now);
    await writeProgressRegistry(registry);
    await writeBattleSessions(sessions);
    await appendEconomyLog({
      playerId: String(id),
      action: 'battle_reward',
      delta: economyDelta,
      context: {
        sessionId,
        mode,
        result,
        pveContext,
        rewards,
        nftGameBonus: nftBonuses.gameRewardBonus,
      },
      balanceAfter: progress.currencies,
    });
    res.json({ ok: true, rewardModal, nftBonuses, progress, updatedAt });
  } catch (e) {
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
    const registry = await readProgressRegistry();
    const progress = normalizeProgress(registry[id]?.progress);
    const payment = req.body?.payment === 'gft' ? 'gft' : 'default';
    const costDelta = { gft: 0, crystals: 0, coins: 0 };

    if (payment === 'gft') {
      const cost = GFT_CARD_PACK_COSTS[packType];
      if (!cost) return res.status(400).json({ error: 'This pack cannot be bought for GFT' });
      if (progress.currencies.gft < cost) return res.status(400).json({ error: 'Not enough GFT', available: progress.currencies.gft });
      progress.currencies.gft -= cost;
      costDelta.gft = -cost;
    } else if (pack.costCoins != null) {
      if (progress.currencies.coins < pack.costCoins) return res.status(400).json({ error: 'Not enough coins', available: progress.currencies.coins });
      progress.currencies.coins -= pack.costCoins;
      costDelta.coins = -pack.costCoins;
    } else if (pack.costCrystals != null) {
      if (progress.currencies.crystals < pack.costCrystals) return res.status(400).json({ error: 'Not enough crystals', available: progress.currencies.crystals });
      progress.currencies.crystals -= pack.costCrystals;
      costDelta.crystals = -pack.costCrystals;
    }

    const packResult = grantCardPack(progress, packType, await getCardCatalog());
    const updatedAt = persistPlayerProgress(registry, id, progress);
    await writeProgressRegistry(registry);
    await appendEconomyLog({
      playerId: String(id),
      action: 'card_pack_open',
      delta: {
        ...costDelta,
        shards: packResult.results.reduce((sum, result) => sum + result.shards, 0),
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

// Create a deposit payload: user pays GFT (issued currency) to treasury.
app.post('/api/gft/deposit', async (req, res) => {
  if (!xumm) return res.status(500).json({ error: 'Xaman backend not configured (missing XUMM_API_KEY/XUMM_API_SECRET).' });
  if (!TREASURY_XRPL_ADDRESS) return res.status(500).json({ error: 'Treasury address not configured (missing TREASURY_XRPL_ADDRESS).' });
  if (!GFT_ISSUER) return res.status(500).json({ error: 'GFT issuer not configured (missing GFT_ISSUER).' });

  const amount = String(req.body?.amount ?? '').trim();
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Invalid amount' });
  // keep a sane range for demo
  if (value > 1_000_000) return res.status(400).json({ error: 'Amount too large' });

  try {
    const payload = await xumm.payload?.create({
      txjson: {
        TransactionType: 'Payment',
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

