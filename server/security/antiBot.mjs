import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

function nowTs() {
  return Date.now();
}

function stdev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createDefaultProfile(playerId) {
  return {
    playerId: String(playerId),
    riskScore: 0,
    flags: [],
    lastActivity: new Date().toISOString(),
    status: 'normal',
    underReview: false,
    events: [],
  };
}

export function createAntiBot({ dataDir }) {
  const filePath = path.join(dataDir, 'security-profiles.json');
  const sharedFingerprintMap = new Map(); // fp => Set(playerId)
  const byPlayer = new Map();
  let loaded = false;
  let saveTimer = null;

  async function ensureDataDir() {
    if (existsSync(dataDir)) return;
    await mkdir(dataDir, { recursive: true });
  }

  async function load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
      for (const p of list) {
        const profile = {
          ...createDefaultProfile(p.playerId),
          ...p,
          events: Array.isArray(p?.events) ? p.events.slice(-300) : [],
          flags: Array.isArray(p?.flags) ? p.flags : [],
        };
        byPlayer.set(String(profile.playerId), profile);
      }
    } catch (e) {
      if (e?.code !== 'ENOENT') {
        console.warn('[antibot] load failed:', e?.message || e);
      }
    }
  }

  async function saveNow() {
    await ensureDataDir();
    const payload = JSON.stringify(
      {
        profiles: [...byPlayer.values()].map((p) => ({ ...p, events: p.events.slice(-300) })),
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, payload, 'utf8');
    await rename(tmp, filePath);
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveNow().catch(() => {});
      saveTimer = null;
    }, 350);
  }

  function getOrCreate(playerId) {
    const key = String(playerId || '').trim();
    if (!key) return null;
    if (!byPlayer.has(key)) byPlayer.set(key, createDefaultProfile(key));
    return byPlayer.get(key);
  }

  function detectRiskAdd(profile, event) {
    const now = nowTs();
    const recent5m = profile.events.filter((e) => now - Number(e.ts || 0) <= 5 * 60 * 1000);
    const recent1h = profile.events.filter((e) => now - Number(e.ts || 0) <= 60 * 60 * 1000);
    const recent24h = profile.events.filter((e) => now - Number(e.ts || 0) <= 24 * 60 * 60 * 1000);
    let add = 0;

    // Массовые API-запросы
    const apiReqCount = recent5m.filter((e) => e.type === 'api_request').length;
    if (apiReqCount > 180) add += 25;
    else if (apiReqCount > 120) add += 16;
    else if (apiReqCount > 80) add += 9;

    // Частота боёв / наград
    const battleCount = recent1h.filter((e) => e.type === 'pvp_enter' || e.type === 'battle_reward').length;
    if (battleCount > 65) add += 14;

    // Идеально равномерные интервалы действий
    const last = recent1h.slice(-24);
    if (last.length >= 8) {
      const intervals = [];
      for (let i = 1; i < last.length; i += 1) intervals.push(last[i].ts - last[i - 1].ts);
      const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
      const sigma = stdev(intervals);
      if (avg > 200 && avg < 20000 && sigma < 220) add += 18;
      else if (avg > 200 && avg < 30000 && sigma < 500) add += 10;
    }

    // "24/7" активность: много уникальных часов за сутки
    const activeHours = new Set(recent24h.map((e) => new Date(e.ts).getUTCHours())).size;
    if (activeHours >= 22 && recent24h.length > 250) add += 16;
    else if (activeHours >= 20 && recent24h.length > 180) add += 10;

    // Подозрительные выводы
    const withdraws = recent24h.filter((e) => e.type === 'withdraw_request');
    if (withdraws.length >= 4) add += 22;
    else if (withdraws.length >= 2) add += 10;
    const sumWithdraw = withdraws.reduce((s, e) => s + Math.max(0, Number(e.metadata?.amount || 0)), 0);
    if (sumWithdraw >= 600) add += 20;
    else if (sumWithdraw >= 300) add += 8;

    // Shared fingerprint / ip / ua
    const fp = String(event.metadata?.fingerprint || '');
    if (fp) {
      const set = sharedFingerprintMap.get(fp) || new Set();
      set.add(profile.playerId);
      sharedFingerprintMap.set(fp, set);
      if (set.size >= 5) add += 22;
      else if (set.size >= 3) add += 12;
    }

    return add;
  }

  function updateStatus(profile) {
    const score = Number(profile.riskScore || 0);
    if (score > 90) profile.status = 'blocked';
    else if (score > 80) profile.status = 'limited';
    else if (score > 60) profile.status = 'suspicious';
    else profile.status = 'normal';
    if (profile.status !== 'normal') profile.underReview = true;
  }

  async function logEvent(playerId, eventType, metadata = {}) {
    await load();
    const profile = getOrCreate(playerId);
    if (!profile) return null;
    const ts = nowTs();
    profile.events.push({
      ts,
      type: String(eventType || 'unknown'),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
    profile.events = profile.events.slice(-300);
    profile.lastActivity = new Date(ts).toISOString();

    // Плавное снижение риска при нормальном поведении
    profile.riskScore = Math.max(0, Number(profile.riskScore || 0) - 0.4);
    profile.riskScore += detectRiskAdd(profile, { metadata });
    profile.riskScore = clamp(Math.round(profile.riskScore * 10) / 10, 0, 100);
    updateStatus(profile);
    scheduleSave();
    return { ...profile, events: profile.events.slice(-15) };
  }

  async function getProfile(playerId) {
    await load();
    return getOrCreate(playerId);
  }

  async function listSuspicious(limit = 50) {
    await load();
    return [...byPlayer.values()]
      .filter((p) => Number(p.riskScore || 0) > 60 || p.status !== 'normal' || p.underReview)
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))
      .slice(0, Math.max(1, limit))
      .map((p) => ({ ...p, recentEvents: p.events.slice(-10) }));
  }

  async function flagPlayer(playerId, reason, action = 'warn') {
    await load();
    const profile = getOrCreate(playerId);
    if (!profile) return null;
    profile.flags.push({
      at: new Date().toISOString(),
      reason: String(reason || 'manual_flag'),
      action: String(action || 'warn'),
    });
    const bump = action === 'ban' ? 100 : action === 'block_withdraw' ? 95 : action === 'limit_rewards' ? 82 : 65;
    profile.riskScore = Math.max(profile.riskScore, bump);
    updateStatus(profile);
    scheduleSave();
    return profile;
  }

  function rewardMultiplierFor(profile) {
    if (!profile) return 1;
    if (profile.riskScore > 90) return 0.2;
    if (profile.riskScore > 80) return 0.35;
    return 1;
  }

  return {
    load,
    save: saveNow,
    logEvent,
    getProfile,
    listSuspicious,
    flagPlayer,
    canWithdraw: (profile) => rewardMultiplierFor(profile) > 0 && Number(profile?.riskScore || 0) <= 90,
    rewardMultiplierFor,
  };
}

