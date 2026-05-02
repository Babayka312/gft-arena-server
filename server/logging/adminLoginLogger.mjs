import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

export function createAdminLoginLogger({ dataDir }) {
  const filePath = path.join(dataDir, 'admin-login-logs.json');
  let loaded = false;
  let seq = 0;
  const logs = [];

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
      seq = Math.max(0, Number(parsed?.lastSeq || 0));
      const rows = Array.isArray(parsed?.logs) ? parsed.logs : [];
      logs.push(...rows);
    } catch (e) {
      if (e?.code !== 'ENOENT') console.warn('[admin-login-logger] load failed:', e?.message || e);
    }
  }

  async function save() {
    await ensureDataDir();
    const payload = JSON.stringify({ lastSeq: seq, logs }, null, 2);
    const tmp = `${filePath}.tmp`;
    await writeFile(tmp, payload, 'utf8');
    await rename(tmp, filePath);
  }

  async function log({ ip, userAgent, success, reason = '' }) {
    await load();
    seq += 1;
    logs.push({
      id: `admin-log-${seq}`,
      timestamp: new Date().toISOString(),
      ip: String(ip || ''),
      userAgent: String(userAgent || ''),
      success: Boolean(success),
      reason: String(reason || ''),
    });
    if (logs.length > 5000) logs.splice(0, logs.length - 5000);
    await save();
  }

  async function list(limit = 200) {
    await load();
    return [...logs]
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, Math.max(1, limit));
  }

  return { load, save, log, list };
}

