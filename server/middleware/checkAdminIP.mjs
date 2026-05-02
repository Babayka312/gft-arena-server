function normalizeIp(ip) {
  const raw = String(ip || '').trim();
  if (!raw) return '';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
}

export function createCheckAdminIP({ allowedIps }) {
  const allowed = new Set(
    String(allowedIps || '')
      .split(',')
      .map((s) => normalizeIp(s))
      .filter(Boolean),
  );

  return function checkAdminIP(req, res, next) {
    if (allowed.size === 0) return next();
    const fwd = String(req.get('x-forwarded-for') || '').split(',')[0].trim();
    const ip = normalizeIp(fwd || req.ip || req.socket?.remoteAddress || '');
    if (!allowed.has(ip)) return res.status(403).json({ error: 'Access denied by IP policy' });
    return next();
  };
}

