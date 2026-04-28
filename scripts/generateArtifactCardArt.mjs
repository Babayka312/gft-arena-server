/**
 * Картинка артефакта как у карточек отряда: один слой арта (по типу) + рамка редкости поверх (getRarityFrameUrl).
 * Пишет 4 SVG 512×512 под «окно» рамки из public/images/frames/rarity-*.svg
 */
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const artDir = path.join(root, 'public', 'images', 'artifacts', 'art');
const legacyDir = path.join(root, 'public', 'images', 'artifacts');

/** Нейтральные цвета: редкость задаёт только рамка поверх */
const BG0 = '#0a0f18';
const BG1 = '#141c2e';
const STROKE = '#64748b';
const ACCENT = '#38bdf8';
const SOFT = '#94a3b8';

function wrap(title, inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BG0}"/>
      <stop offset="100%" style="stop-color:${BG1}"/>
    </linearGradient>
    <filter id="softG" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="vignette" cx="50%" cy="42%" r="65%">
      <stop offset="0%" style="stop-color:#1e293b;stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:#020617;stop-opacity:0.9"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#vignette)"/>
  <g filter="url(#softG)">
${inner}
  </g>
</svg>`;
}

const types = {
  weapon: {
    title: 'Оружие',
    body: `
    <!-- Центр ~ 360: область x 76..436, y 76..436 -->
    <path d="M256 96 L272 120 L272 360 L256 392 L240 360 L240 120 Z" fill="#1e293b" stroke="${STROKE}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M256 72 L256 48" stroke="${ACCENT}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="256" cy="36" r="14" fill="${SOFT}" opacity="0.95"/>
    <path d="M216 384 L296 384 L288 430 L224 430 Z" fill="${STROKE}" opacity="0.9"/>
    <path d="M200 300 L192 440 M312 300 L320 440" stroke="${STROKE}" stroke-width="8" opacity="0.55"/>`,
  },
  armor: {
    title: 'Броня',
    body: `
    <path d="M160 188 C188 140 324 140 352 188 L364 380 C364 420 320 460 256 476 C192 460 148 420 148 380 Z" fill="#1e293b" stroke="${STROKE}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M220 240 L292 240 M224 300 L288 300" stroke="${ACCENT}" stroke-width="12" stroke-linecap="round" opacity="0.85"/>
    <ellipse cx="256" cy="200" rx="48" ry="40" fill="none" stroke="${SOFT}" stroke-width="8" opacity="0.6"/>
    <path d="M256 260 L256 400" stroke="${STROKE}" stroke-width="6" opacity="0.45"/>`,
  },
  accessory: {
    title: 'Аксессуар',
    body: `
    <circle cx="256" cy="256" r="136" fill="none" stroke="${STROKE}" stroke-width="14"/>
    <circle cx="256" cy="256" r="88" fill="#1e293b" stroke="${SOFT}" stroke-width="8"/>
    <path d="M256 172 L284 226 L228 226 Z" fill="${ACCENT}" opacity="0.95"/>
    <circle cx="256" cy="256" r="22" fill="${SOFT}" opacity="0.95"/>
    <ellipse cx="256" cy="420" rx="112" ry="24" fill="${ACCENT}" opacity="0.12"/>`,
  },
  relic: {
    title: 'Реликвия',
    body: `
    <path d="M256 120 L336 296 L256 472 L176 296 Z" fill="#1e293b" stroke="${STROKE}" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="256" cy="188" r="36" fill="${ACCENT}" opacity="0.95"/>
    <path d="M256 240 L256 400" stroke="${SOFT}" stroke-width="8" opacity="0.8"/>
    <path d="M192 300 L148 376 M320 300 L364 376" stroke="${ACCENT}" stroke-width="10" stroke-linecap="round" opacity="0.7"/>`,
  },
};

mkdirSync(artDir, { recursive: true });

for (const [slug, spec] of Object.entries(types)) {
  writeFileSync(path.join(artDir, `${slug}.svg`), wrap(spec.title, spec.body.trim()), 'utf8');
}

// Удалить старый набор portrait-{type}-{rarity}.svg (если есть)
try {
  const files = readdirSync(legacyDir);
  for (const f of files) {
    if (/^(weapon|armor|accessory|relic)-(common|rare|epic|legendary|mythic)\.svg$/.test(f)) {
      unlinkSync(path.join(legacyDir, f));
    }
  }
} catch {
  /* нет каталога */
}

console.log(`Wrote 4 artifact art layers → ${path.relative(root, artDir)}`);
console.log('Removed legacy rarity-specific artifact-*.svg in artifacts/ (if present).');
