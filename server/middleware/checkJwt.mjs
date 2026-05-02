import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signRaw(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

export function createJwtTools({ secret, issuer = 'gft-arena-admin' }) {
  function signJwt(payload, expiresSec = 3600) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iss: issuer, iat: now, exp: now + expiresSec };
    const p1 = b64url(JSON.stringify(header));
    const p2 = b64url(JSON.stringify(body));
    const sig = signRaw(`${p1}.${p2}`, secret);
    return `${p1}.${p2}.${sig}`;
  }

  function verifyJwt(token) {
    try {
      const [h, p, s] = String(token || '').split('.');
      if (!h || !p || !s) return { ok: false, error: 'malformed' };
      const expected = signRaw(`${h}.${p}`, secret);
      if (!safeEq(expected, s)) return { ok: false, error: 'bad_signature' };
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      if (payload?.iss !== issuer) return { ok: false, error: 'bad_issuer' };
      const now = Math.floor(Date.now() / 1000);
      if (!Number.isFinite(Number(payload?.exp)) || Number(payload.exp) <= now) return { ok: false, error: 'expired' };
      return { ok: true, payload };
    } catch {
      return { ok: false, error: 'invalid' };
    }
  }

  return { signJwt, verifyJwt };
}

export function parseCookies(req) {
  const src = String(req.get('cookie') || '');
  const out = {};
  for (const part of src.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    out[k] = v;
  }
  return out;
}

export function setCookie(res, { name, value, maxAgeSec = 3600, httpOnly = true, sameSite = 'Strict', secure = true, path = '/' }) {
  const parts = [
    `${name}=${encodeURIComponent(String(value))}`,
    `Path=${path}`,
    `Max-Age=${Math.max(1, Math.floor(maxAgeSec))}`,
    sameSite ? `SameSite=${sameSite}` : '',
    secure ? 'Secure' : '',
    httpOnly ? 'HttpOnly' : '',
  ].filter(Boolean);
  res.append('Set-Cookie', parts.join('; '));
}

export function clearCookie(res, name) {
  res.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly`);
}

export function createCheckJwt({ verifyJwt, cookieName = 'admin_jwt', allowPre2fa = false }) {
  return function checkJwt(req, res, next) {
    const auth = String(req.get('authorization') || '');
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const cookies = parseCookies(req);
    const token = bearer || cookies[cookieName] || '';
    if (!token) return res.status(401).json({ error: 'JWT required' });
    const v = verifyJwt(token);
    if (!v.ok) return res.status(401).json({ error: 'JWT invalid or expired', reason: v.error });
    if (!allowPre2fa && v.payload?.twoFactorVerified !== true) {
      return res.status(401).json({ error: '2FA not verified' });
    }
    req.adminAuth = v.payload;
    return next();
  };
}

