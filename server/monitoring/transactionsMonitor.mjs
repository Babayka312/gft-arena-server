import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { runAnomalyDetectors } from './anomalyDetection.mjs';

function clampNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function createTransactionsMonitor({ dataDir, antiBot, alertsStore }) {
  const txFile = path.join(dataDir, 'economy-transactions.json');
  const playerEconomyFile = path.join(dataDir, 'player-economy.json');
  let loaded = false;
  let seq = 0;
  const transactions = [];
  const byPlayerEconomy = new Map();

  async function ensureDataDir() {
    if (existsSync(dataDir)) return;
    await mkdir(dataDir, { recursive: true });
  }

  function defaultPlayerEconomy(playerId) {
    return {
      playerId: String(playerId),
      gftBalance: 0,
      stakedGft: 0,
      totalEarnedGft: 0,
      totalWithdrawnGft: 0,
    };
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await readFile(txFile, 'utf8');
      const parsed = JSON.parse(raw);
      seq = Math.max(0, Number(parsed?.lastSeq || 0));
      const rows = Array.isArray(parsed?.transactions) ? parsed.transactions : [];
      for (const row of rows) transactions.push(row);
    } catch (e) {
      if (e?.code !== 'ENOENT') console.warn('[tx-monitor] tx load failed:', e?.message || e);
    }
    try {
      const raw = await readFile(playerEconomyFile, 'utf8');
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.players) ? parsed.players : [];
      for (const row of rows) byPlayerEconomy.set(String(row.playerId), row);
    } catch (e) {
      if (e?.code !== 'ENOENT') console.warn('[tx-monitor] player load failed:', e?.message || e);
    }
  }

  async function save() {
    await ensureDataDir();
    const txPayload = JSON.stringify({ lastSeq: seq, transactions }, null, 2);
    const txTmp = `${txFile}.tmp`;
    await writeFile(txTmp, txPayload, 'utf8');
    await rename(txTmp, txFile);
    const playersPayload = JSON.stringify({ players: [...byPlayerEconomy.values()] }, null, 2);
    const peTmp = `${playerEconomyFile}.tmp`;
    await writeFile(peTmp, playersPayload, 'utf8');
    await rename(peTmp, playerEconomyFile);
  }

  function getOrCreatePlayerEconomy(playerId) {
    const key = String(playerId);
    if (!byPlayerEconomy.has(key)) byPlayerEconomy.set(key, defaultPlayerEconomy(key));
    return byPlayerEconomy.get(key);
  }

  function updatePlayerEconomy(playerId, type, amount, metadata = {}) {
    const pe = getOrCreatePlayerEconomy(playerId);
    const n = clampNum(amount);
    if (type === 'reward') {
      pe.totalEarnedGft += Math.max(0, n);
      pe.gftBalance += Math.max(0, n);
    } else if (type === 'withdraw') {
      pe.totalWithdrawnGft += Math.max(0, n);
      pe.gftBalance -= Math.max(0, n);
    } else if (type === 'stake') {
      pe.stakedGft += Math.max(0, n);
      pe.gftBalance -= Math.max(0, n);
    } else if (type === 'unstake') {
      pe.stakedGft -= Math.max(0, n);
      pe.gftBalance += Math.max(0, n);
    } else if (type === 'spend') {
      pe.gftBalance -= Math.max(0, n);
    } else if (type === 'balance_adjust') {
      pe.gftBalance += n;
    }
    pe.stakedGft = Math.max(0, pe.stakedGft);
    return pe;
  }

  async function maybeDetectAnomalies() {
    const recent = transactions.slice(-1500);
    const detected = runAnomalyDetectors(recent, Date.now());
    for (const alert of detected) {
      const created = await alertsStore.createAlert(alert);
      for (const pid of created.involvedPlayers || []) {
        await antiBot.flagPlayer(pid, `anomaly:${created.type}`, 'limit_rewards');
      }
    }
  }

  async function logTransaction({
    playerId,
    type,
    amount = 0,
    source = null,
    destination = null,
    metadata = {},
    ip = null,
    userAgent = null,
    riskScore = 0,
  }) {
    await load();
    seq += 1;
    const row = {
      id: `tx-${seq}`,
      playerId: String(playerId),
      type: String(type),
      amount: clampNum(amount),
      source: source == null ? null : String(source),
      destination: destination == null ? null : String(destination),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      timestamp: new Date().toISOString(),
      ts: Date.now(),
      ip: ip == null ? null : String(ip),
      userAgent: userAgent == null ? null : String(userAgent),
      riskScore: clampNum(riskScore),
    };
    transactions.push(row);
    if (transactions.length > 50000) transactions.splice(0, transactions.length - 50000);
    updatePlayerEconomy(playerId, row.type, row.amount, row.metadata);
    await maybeDetectAnomalies();
    await save();
    return row;
  }

  async function getTransactions(filters = {}) {
    await load();
    let list = [...transactions];
    if (filters.playerId) list = list.filter((t) => String(t.playerId) === String(filters.playerId));
    if (filters.type) list = list.filter((t) => String(t.type) === String(filters.type));
    if (filters.fromTs) list = list.filter((t) => Number(t.ts) >= Number(filters.fromTs));
    if (filters.toTs) list = list.filter((t) => Number(t.ts) <= Number(filters.toTs));
    if (filters.minAmount != null) list = list.filter((t) => Number(t.amount) >= Number(filters.minAmount));
    if (filters.maxAmount != null) list = list.filter((t) => Number(t.amount) <= Number(filters.maxAmount));
    list.sort((a, b) => Number(b.ts) - Number(a.ts));
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.max(1, Math.min(200, Number(filters.pageSize || 50)));
    const start = (page - 1) * pageSize;
    return {
      total: list.length,
      page,
      pageSize,
      items: list.slice(start, start + pageSize),
    };
  }

  async function getOverview() {
    await load();
    let emission = 0;
    let withdrawn = 0;
    let staked = 0;
    let rewardEvents = 0;
    let rewardAmount = 0;
    const activePlayers = new Set();
    for (const t of transactions) {
      const amount = Math.max(0, Number(t.amount || 0));
      if (t.type === 'reward') {
        emission += amount;
        rewardEvents += 1;
        rewardAmount += amount;
      } else if (t.type === 'withdraw') withdrawn += amount;
      else if (t.type === 'stake') staked += amount;
      const ageMs = Date.now() - Number(t.ts || 0);
      if (ageMs <= 24 * 60 * 60 * 1000) activePlayers.add(String(t.playerId));
    }
    return {
      totalEmissionGft: emission,
      totalStakedGft: staked,
      totalWithdrawnGft: withdrawn,
      activePlayers24h: activePlayers.size,
      averageRewardGft: rewardEvents > 0 ? Number((rewardAmount / rewardEvents).toFixed(3)) : 0,
    };
  }

  async function getPlayer(playerId) {
    await load();
    const profile = byPlayerEconomy.get(String(playerId)) || defaultPlayerEconomy(playerId);
    const history = transactions
      .filter((t) => String(t.playerId) === String(playerId))
      .sort((a, b) => Number(b.ts) - Number(a.ts))
      .slice(0, 200);
    return { profile, history };
  }

  return {
    load,
    save,
    logTransaction,
    getTransactions,
    getOverview,
    getPlayer,
  };
}

