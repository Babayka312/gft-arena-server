import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

export function createAlertsStore({ dataDir }) {
  const filePath = path.join(dataDir, 'security-alerts.json');
  let loaded = false;
  let seq = 0;
  const alerts = [];

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
      const list = Array.isArray(parsed?.alerts) ? parsed.alerts : [];
      for (const a of list) alerts.push(a);
      seq = Math.max(0, Number(parsed?.lastSeq || 0));
    } catch (e) {
      if (e?.code !== 'ENOENT') console.warn('[alerts] load failed:', e?.message || e);
    }
  }

  async function save() {
    await ensureDataDir();
    const payload = JSON.stringify({ lastSeq: seq, alerts }, null, 2);
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, payload, 'utf8');
    await rename(tmp, filePath);
  }

  async function createAlert({ type, severity = 'medium', involvedPlayers = [], details = {} }) {
    await load();
    seq += 1;
    const row = {
      id: `alert-${seq}`,
      type: String(type || 'unknown'),
      severity: String(severity || 'medium'),
      involvedPlayers: Array.isArray(involvedPlayers) ? involvedPlayers.map(String) : [],
      details: details && typeof details === 'object' ? details : {},
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    alerts.push(row);
    if (alerts.length > 5000) alerts.splice(0, alerts.length - 5000);
    await save();
    return row;
  }

  async function list({ unresolvedOnly = false, limit = 200 } = {}) {
    await load();
    const rows = unresolvedOnly ? alerts.filter((a) => !a.resolvedAt) : alerts;
    return [...rows]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, Math.max(1, limit));
  }

  return {
    load,
    save,
    createAlert,
    list,
  };
}

