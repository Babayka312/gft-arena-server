export function createRateLimit({ maxAttempts = 5, windowMs = 10 * 60 * 1000, blockMs = 10 * 60 * 1000 } = {}) {
  const byIp = new Map(); // ip -> { attempts: number[], blockedUntil: number }

  function prune(entry, now) {
    entry.attempts = entry.attempts.filter((t) => now - t <= windowMs);
    if (entry.blockedUntil && entry.blockedUntil <= now) entry.blockedUntil = 0;
  }

  function getIp(req) {
    const fwd = String(req.get('x-forwarded-for') || '').split(',')[0].trim();
    return fwd || req.ip || req.socket?.remoteAddress || 'unknown';
  }

  function registerAttempt(req, success) {
    const ip = getIp(req);
    const now = Date.now();
    const entry = byIp.get(ip) || { attempts: [], blockedUntil: 0 };
    prune(entry, now);
    if (!success) {
      entry.attempts.push(now);
      if (entry.attempts.length >= maxAttempts) entry.blockedUntil = now + blockMs;
    }
    byIp.set(ip, entry);
    return { ip, blockedUntil: entry.blockedUntil };
  }

  function middleware(req, res, next) {
    const ip = getIp(req);
    const now = Date.now();
    const entry = byIp.get(ip) || { attempts: [], blockedUntil: 0 };
    prune(entry, now);
    byIp.set(ip, entry);
    if (entry.blockedUntil > now) {
      return res.status(429).json({
        error: 'Too many attempts. Temporarily blocked.',
        retryAfterSec: Math.ceil((entry.blockedUntil - now) / 1000),
      });
    }
    return next();
  }

  return { middleware, registerAttempt };
}

