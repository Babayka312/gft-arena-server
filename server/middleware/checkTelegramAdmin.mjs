import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseCookies } from './checkJwt.mjs';

function parseInitData(raw) {
  const params = new URLSearchParams(String(raw || ''));
  const hash = params.get('hash') || '';
  if (!hash) return null;
  const entries = [];
  for (const [k, v] of params.entries()) {
    if (k === 'hash') continue;
    entries.push(`${k}=${v}`);
  }
  entries.sort();
  const dataCheckString = entries.join('\n');
  const userJson = params.get('user') || '{}';
  let user = null;
  try { user = JSON.parse(userJson); } catch { user = null; }
  return {
    hash,
    authDate: Number(params.get('auth_date') || 0),
    dataCheckString,
    user,
  };
}

function safeEqHex(a, b) {
  try {
    const A = Buffer.from(String(a || ''), 'hex');
    const B = Buffer.from(String(b || ''), 'hex');
    if (A.length === 0 || B.length === 0 || A.length !== B.length) return false;
    return timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

export function verifyTelegramInitData(initData, botToken, maxAgeSec = 24 * 60 * 60) {
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, reason: 'missing_hash' };
  const secret = createHmac('sha256', 'WebAppData').update(String(botToken || '')).digest();
  const calculated = createHmac('sha256', secret).update(parsed.dataCheckString).digest('hex');
  if (!safeEqHex(calculated, parsed.hash)) return { ok: false, reason: 'bad_signature' };
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(parsed.authDate) || parsed.authDate <= 0) return { ok: false, reason: 'bad_auth_date' };
  if (now - parsed.authDate > maxAgeSec) return { ok: false, reason: 'expired' };
  const userId = Number(parsed.user?.id || 0);
  if (!Number.isFinite(userId) || userId <= 0) return { ok: false, reason: 'missing_user' };
  return { ok: true, telegramUserId: String(Math.floor(userId)), user: parsed.user };
}

export function createCheckTelegramAdmin({ botToken, adminTelegramId, maxAgeSec = 24 * 60 * 60 }) {
  const allowedId = String(adminTelegramId || '').trim();
  return function checkTelegramAdmin(req, res, next) {
    if (!String(botToken || '').trim() || !allowedId) {
      return res.status(503).json({ error: 'Telegram admin auth is not configured' });
    }
    const cookies = parseCookies(req);
    const initData =
      String(req.get('x-telegram-init-data') || '') ||
      String(req.body?.telegramInitData || '') ||
      String(req.query?.telegramInitData || '') ||
      String(cookies.admin_tg_init || '');
    if (!initData) return res.status(401).json({ error: 'Telegram initData required' });
    const v = verifyTelegramInitData(initData, botToken, maxAgeSec);
    if (!v.ok) return res.status(403).json({ error: 'Access denied (Telegram)', reason: v.reason });
    if (!allowedId || v.telegramUserId !== allowedId) {
      return res.status(403).json({ error: 'Access denied (not admin Telegram)' });
    }
    req.telegramAdmin = { id: v.telegramUserId, user: v.user, initData };
    return next();
  };
}

