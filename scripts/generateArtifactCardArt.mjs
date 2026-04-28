/**
 * Уникальный арт артефакта (тип × редкость) для слоя под рамкой отряда.
 * Выход: public/images/artifacts/art/{type}-{rarity}.{svg,png}, плюс {type}.{svg,png} (общий fallback).
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const artDir = path.join(root, 'public', 'images', 'artifacts', 'art');
const legacyDir = path.join(root, 'public', 'images', 'artifacts');
const ART_VERSION = '2026-v3';

const RARITIES = [
  {
    slug: 'common',
    bg: ['#0a1320', '#0f1e33', '#1f2937'],
    frame: '#64748b',
    accent: '#94a3b8',
    glow: '#cbd5e1',
    deep: '#1e293b',
    particles: 0,
    ornaments: 0,
  },
  {
    slug: 'rare',
    bg: ['#04111e', '#082f49', '#0e7490'],
    frame: '#0ea5e9',
    accent: '#7dd3fc',
    glow: '#22d3ee',
    deep: '#0c4a6e',
    particles: 6,
    ornaments: 1,
  },
  {
    slug: 'epic',
    bg: ['#1a0a2e', '#2e1065', '#581c87'],
    frame: '#a855f7',
    accent: '#d8b4fe',
    glow: '#c084fc',
    deep: '#3b0764',
    particles: 10,
    ornaments: 2,
  },
  {
    slug: 'legendary',
    bg: ['#2a1305', '#451a03', '#7c2d12'],
    frame: '#f59e0b',
    accent: '#fde68a',
    glow: '#fbbf24',
    deep: '#78350f',
    particles: 14,
    ornaments: 3,
  },
  {
    slug: 'mythic',
    bg: ['#2a0a1e', '#4a044e', '#831843'],
    frame: '#ec4899',
    accent: '#fbcfe8',
    glow: '#f472b6',
    deep: '#831843',
    particles: 18,
    ornaments: 4,
  },
];

function particles(seed, count, color) {
  let n = seed;
  const rand = () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = 60 + rand() * 392;
    const y = 60 + rand() * 392;
    const r = 1.6 + rand() * 3.4;
    const op = (0.35 + rand() * 0.55).toFixed(2);
    out += `\n    <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${color}" opacity="${op}"/>`;
  }
  return out;
}

function ornaments(level, color) {
  if (level <= 0) return '';
  const arcs = [
    `<path d="M64 130 Q64 64 130 64" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`,
    `<path d="M382 64 Q448 64 448 130" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`,
    `<path d="M64 382 Q64 448 130 448" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`,
    `<path d="M382 448 Q448 448 448 382" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`,
  ];
  return arcs.slice(0, level).join('\n    ');
}

function frame(color) {
  return `
    <rect x="40" y="40" width="432" height="432" rx="32" fill="none" stroke="${color}" stroke-width="3" opacity="0.55"/>
    <rect x="56" y="56" width="400" height="400" rx="24" fill="none" stroke="${color}" stroke-width="1" opacity="0.35"/>`;
}

function bgBlock(slug, type, rarity) {
  return `
    <linearGradient id="${slug}-${type}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${rarity.bg[0]}"/>
      <stop offset="55%" stop-color="${rarity.bg[1]}"/>
      <stop offset="100%" stop-color="${rarity.bg[2]}"/>
    </linearGradient>
    <radialGradient id="${slug}-${type}-glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${rarity.glow}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <filter id="${slug}-${type}-soft" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="3.5"/>
    </filter>
    <filter id="${slug}-${type}-strong" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
}

function shellSvg(slug, type, rarity, defs, body) {
  const id = `${slug}-${type}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-art="${ART_VERSION}" data-rarity="${slug}" data-type="${type}">
  <defs>
${bgBlock(slug, type, rarity)}
${defs}
  </defs>
  <rect width="512" height="512" fill="url(#${id}-bg)"/>
  <rect width="512" height="512" fill="url(#${id}-glow)"/>
  <g opacity="0.12" stroke="${rarity.accent}" stroke-width="1" fill="none">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${32 + i * 56}" y1="40" x2="${32 + i * 56}" y2="472"/>`).join('\n    ')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="40" y1="${32 + i * 56}" x2="472" y2="${32 + i * 56}"/>`).join('\n    ')}
  </g>
  ${frame(rarity.frame)}
  ${ornaments(rarity.ornaments, rarity.accent)}
  ${particles((slug.length + 1) * 7 + type.length * 3, rarity.particles, rarity.glow)}
  ${body(slug, type, rarity)}
</svg>`;
}

const builders = {
  weapon(slug, type, rarity) {
    return `
  <g filter="url(#${slug}-${type}-strong)">
    <linearGradient id="${slug}-${type}-blade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${rarity.accent}"/>
      <stop offset="40%" stop-color="${rarity.glow}"/>
      <stop offset="100%" stop-color="${rarity.frame}"/>
    </linearGradient>
  </g>
  <g transform="translate(256 268)">
    <path d="M-18 -180 L18 -180 L24 40 L14 200 L0 222 L-14 200 L-24 40 Z" fill="${rarity.deep}" stroke="${rarity.accent}" stroke-width="4" opacity="0.95"/>
    <path d="M-12 -176 L12 -176 L18 36 L10 196 L0 214 L-10 196 L-18 36 Z" fill="${rarity.glow}" opacity="0.85"/>
    <path d="M-50 -22 L50 -22 L42 12 L-42 12 Z" fill="${rarity.deep}" stroke="${rarity.accent}" stroke-width="3"/>
    <rect x="-12" y="12" width="24" height="92" rx="5" fill="#0f172a" stroke="${rarity.frame}" stroke-width="2"/>
    <circle cx="0" cy="-150" r="20" fill="none" stroke="${rarity.glow}" stroke-width="3"/>
    <circle cx="0" cy="-150" r="6" fill="${rarity.accent}"/>
  </g>
  <path d="M120 130 Q256 50 392 130" fill="none" stroke="${rarity.glow}" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
  <path d="M110 200 Q256 130 402 200" fill="none" stroke="${rarity.accent}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>`;
  },
  armor(slug, type, rarity) {
    return `
  <g filter="url(#${slug}-${type}-soft)">
    <linearGradient id="${slug}-${type}-metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${rarity.accent}"/>
      <stop offset="50%" stop-color="${rarity.deep}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </g>
  <g transform="translate(256 252)">
    <path d="M-126 -52 C-104 -126 104 -126 126 -52 L138 124 C112 198 -112 198 -138 124 Z" fill="url(#${slug}-${type}-metal)" stroke="${rarity.frame}" stroke-width="5"/>
    <path d="M-92 -22 L92 -22 L82 110 L-82 110 Z" fill="${rarity.deep}" stroke="${rarity.accent}" stroke-width="3"/>
    <ellipse cx="0" cy="-66" rx="48" ry="38" fill="none" stroke="${rarity.glow}" stroke-width="4" opacity="0.85"/>
    <rect x="-26" y="-10" width="52" height="80" rx="10" fill="${rarity.glow}" opacity="0.55"/>
    <rect x="-18" y="-2" width="36" height="64" rx="8" fill="${rarity.accent}" opacity="0.85"/>
    <path d="M-138 -22 L-178 -60 M138 -22 L178 -60" stroke="${rarity.frame}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="-78" cy="48" r="14" fill="${rarity.deep}" stroke="${rarity.accent}" stroke-width="2"/>
    <circle cx="78" cy="48" r="14" fill="${rarity.deep}" stroke="${rarity.accent}" stroke-width="2"/>
  </g>`;
  },
  accessory(slug, type, rarity) {
    const segs = [0, 45, 90, 135, 180, 225, 270, 315]
      .map((deg) => {
        const ex = 256 + Math.sin(((deg + 45) * Math.PI) / 180) * 108;
        const ey = 256 - Math.cos(((deg + 45) * Math.PI) / 180) * 108;
        return `<path d="M256 148 A108 108 0 0 1 ${ex.toFixed(0)} ${ey.toFixed(0)}"
        transform="rotate(${deg} 256 256)" fill="none" stroke="${rarity.frame}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`;
      })
      .join('\n  ');
    return `
  <g filter="url(#${slug}-${type}-soft)">
    <linearGradient id="${slug}-${type}-gem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${rarity.accent}"/>
      <stop offset="50%" stop-color="${rarity.glow}"/>
      <stop offset="100%" stop-color="${rarity.deep}"/>
    </linearGradient>
  </g>
  <circle cx="256" cy="256" r="152" fill="none" stroke="${rarity.frame}" stroke-width="20" opacity="0.95"/>
  <circle cx="256" cy="256" r="118" fill="none" stroke="${rarity.accent}" stroke-width="4" opacity="0.55"/>
  <circle cx="256" cy="256" r="100" fill="${rarity.deep}" stroke="${rarity.glow}" stroke-width="6"/>
  ${segs}
  <polygon points="256,148 274,218 338,218 288,262 308,332 256,292 204,332 224,262 174,218 238,218" fill="url(#${slug}-${type}-gem)" stroke="${rarity.accent}" stroke-width="2" opacity="0.95"/>
  <circle cx="256" cy="246" r="28" fill="#0f172a" stroke="${rarity.accent}" stroke-width="3"/>
  <circle cx="256" cy="246" r="10" fill="${rarity.glow}"/>`;
  },
  relic(slug, type, rarity) {
    return `
  <g filter="url(#${slug}-${type}-strong)">
    <linearGradient id="${slug}-${type}-cr" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${rarity.accent}"/>
      <stop offset="50%" stop-color="${rarity.glow}"/>
      <stop offset="100%" stop-color="${rarity.frame}"/>
    </linearGradient>
  </g>
  <g transform="translate(256 256)">
    <path d="M0,-150 L80,-46 L50,128 L-50,128 L-80,-46 Z" fill="url(#${slug}-${type}-cr)" stroke="${rarity.accent}" stroke-width="4"/>
    <path d="M0,-118 L56,-46 L36,98 L-36,98 L-56,-46 Z" fill="${rarity.deep}" opacity="0.55"/>
    <circle cx="0" cy="-22" r="24" fill="${rarity.accent}" opacity="0.95"/>
    <rect x="-4" y="-66" width="8" height="184" fill="${rarity.glow}" opacity="0.45"/>
  </g>
  <ellipse cx="256" cy="424" rx="148" ry="28" fill="${rarity.glow}" opacity="0.18"/>
  <g stroke="${rarity.glow}" stroke-width="2" fill="none" opacity="0.5">
    <ellipse cx="256" cy="256" rx="170" ry="60"/>
    <ellipse cx="256" cy="256" rx="138" ry="44"/>
  </g>
  <path d="M420 340 L472 392 M92 392 L140 340" stroke="${rarity.frame}" stroke-width="3" opacity="0.55" stroke-linecap="round"/>`;
  },
};

const TYPES = ['weapon', 'armor', 'accessory', 'relic'];
const FALLBACK_RARITY = RARITIES.find((r) => r.slug === 'common');

async function writePair(filenameNoExt, svg) {
  const svgPath = path.join(artDir, `${filenameNoExt}.svg`);
  writeFileSync(svgPath, svg, 'utf8');
  const pngPath = path.join(artDir, `${filenameNoExt}.png`);
  await sharp(Buffer.from(svg, 'utf8'))
    .resize(512, 512, { fit: 'fill' })
    .png({ compressionLevel: 9, effort: 7 })
    .toFile(pngPath);
}

async function main() {
  mkdirSync(artDir, { recursive: true });

  let count = 0;
  for (const type of TYPES) {
    for (const rarity of RARITIES) {
      const svg = shellSvg(rarity.slug, type, rarity, '', builders[type]);
      await writePair(`${type}-${rarity.slug}`, svg);
      count++;
    }
    // общий fallback (на случай отсутствия редкости)
    const svgFallback = shellSvg(FALLBACK_RARITY.slug, type, FALLBACK_RARITY, '', builders[type]);
    await writePair(type, svgFallback);
    count++;
  }

  if (existsSync(legacyDir)) {
    for (const f of readdirSync(legacyDir)) {
      if (/^(weapon|armor|accessory|relic)-(common|rare|epic|legendary|mythic)\.svg$/.test(f)) {
        unlinkSync(path.join(legacyDir, f));
      }
    }
  }

  console.log(`[${ART_VERSION}] generated ${count} files (SVG+PNG) → ${path.relative(root, artDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
