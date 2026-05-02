import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

function now() {
  return Date.now();
}

export function createAdminAutoBlock({ dataDir }) {
  const filePath = path.join(dataDir, 'admin-autoblock.json');
  let loaded = false;
  const state = {
    failures: [], // {ts, ip, reason}
    blockedUntil: 0,
    reasons: [],
  };

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
      if (parsed && typeof parsed === 'object') {
        state.failures = Array.isArray(parsed.failures) ? parsed.failures : [];
        state.blockedUntil = Number(parsed.blockedUntil || 0);
        state.reasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
      }
    } catch (e) {
      if (e?.code !== 'ENOENT') console.warn('[admin-autoblock] load failed:', e?.message || e);
    }
  }

  async function save() {
    await ensureDataDir();
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmp, filePath);
  }

  function prune() {
    const n = now();
    state.failures = state.failures.filter((f) => n - Number(f.ts || 0) <= 24 * 60 * 60 * 1000);
    if (state.reasons.length > 50) state.reasons = state.reasons.slice(-50);
  }

  async function registerFailure({ ip, reason }) {
    await load();
    prune();
    const n = now();
    state.failures.push({ ts: n, ip: String(ip || ''), reason: String(reason || 'failed') });
    const lastHour = state.failures.filter((f) => n - Number(f.ts || 0) <= 60 * 60 * 1000);
    const uniqueIps = new Set(lastHour.map((f) => f.ip).filter(Boolean));

    if (String(reason || '') === 'telegram_signature_tamper') {
      state.blockedUntil = Math.max(state.blockedUntil, n + 60 * 60 * 1000);
      state.reasons.push({ at: new Date(n).toISOString(), reason: 'telegram_signature_tamper' });
    } else if (lastHour.length >= 10) {
      state.blockedUntil = Math.max(state.blockedUntil, n + 60 * 60 * 1000);
      state.reasons.push({ at: new Date(n).toISOString(), reason: '10_failed_attempts' });
    } else if (uniqueIps.size >= 3 && lastHour.length >= 3) {
      state.blockedUntil = Math.max(state.blockedUntil, n + 60 * 60 * 1000);
      state.reasons.push({ at: new Date(n).toISOString(), reason: '3_ips_attempts' });
    }
    await save();
  }

  async function isBlocked() {
    await load();
    prune();
    return Number(state.blockedUntil || 0) > now();
  }

  async function getState() {
    await load();
    prune();
    return { ...state };
  }

  return { load, save, registerFailure, isBlocked, getState };
}

