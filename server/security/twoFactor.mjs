import { randomBytes, createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(buf) {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (!chunk) break;
    out += BASE32_ALPHABET[parseInt(chunk.padEnd(5, '0'), 2)];
  }
  return out;
}

function fromBase32(input) {
  const clean = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(out);
}

export function generateSecret(bytes = 20) {
  return toBase32(randomBytes(bytes));
}

function hotp(secret, counter) {
  const key = fromBase32(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

export function verifyTotp(secret, code, { stepSec = 30, window = 1, atMs = Date.now() } = {}) {
  const normalized = String(code || '').replace(/\D/g, '');
  if (normalized.length !== 6) return false;
  const counter = Math.floor(atMs / 1000 / stepSec);
  for (let w = -window; w <= window; w += 1) {
    if (hotp(secret, counter + w) === normalized) return true;
  }
  return false;
}

export function buildOtpAuthUri({ accountName, issuer, secret }) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const q = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}

