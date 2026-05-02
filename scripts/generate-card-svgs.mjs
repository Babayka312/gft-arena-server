import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = process.cwd();
const catalogPath = path.join(repoRoot, 'src', 'cards', 'catalog.ts');
const outDir = path.join(repoRoot, 'public', 'images', 'cards');

function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function rarityColors(rarity) {
  switch (rarity) {
    case 'Common':
      return { a: '#334155', b: '#050816', stroke: '#94a3b8', neon: '#38bdf8' };
    case 'Rare':
      return { a: '#1d4ed8', b: '#050816', stroke: '#60a5fa', neon: '#22d3ee' };
    case 'Epic':
      return { a: '#7c3aed', b: '#050816', stroke: '#c084fc', neon: '#f0abfc' };
    case 'Legendary':
      return { a: '#f59e0b', b: '#050816', stroke: '#fbbf24', neon: '#fde68a' };
    case 'Mythic':
      return { a: '#ef4444', b: '#050816', stroke: '#fb7185', neon: '#67e8f9' };
    default:
      return { a: '#334155', b: '#050816', stroke: '#94a3b8', neon: '#38bdf8' };
  }
}

function elementIcon(element) {
  switch (element) {
    case 'fire':
      return '🔥';
    case 'water':
      return '💧';
    case 'earth':
      return '🪨';
    case 'air':
      return '🌪️';
    case 'light':
      return '✨';
    case 'shadow':
      return '🌑';
    case 'nature':
      return '🌿';
    case 'arcane':
      return '🔮';
    case 'metal':
      return '⚙️';
    case 'toxin':
      return '☣️';
    case 'cosmic':
      return '🌌';
    case 'spirit':
      return '👻';
    default:
      return '⭐';
  }
}

function pickEmoji({ id, name, kind }) {
  const n = name.toLowerCase();
  if (n.includes('мыш')) return '🐭';
  if (n.includes('вороб')) return '🐦';
  if (n.includes('ёж')) return '🦔';
  if (n.includes('заяц') || n.includes('крол')) return '🐇';
  if (n.includes('волк')) return '🐺';
  if (n.includes('кабан')) return '🐗';
  if (n.includes('сокол')) return '🦅';
  if (n.includes('лиса')) return '🦊';
  if (n.includes('медвед')) return '🐻';
  if (n.includes('сова')) return '🦉';
  if (n.includes('зме')) return '🐍';
  if (n.includes('олен')) return '🦌';
  if (n.includes('краб')) return '🦀';
  if (n.includes('пиран')) return '🐟';
  if (n.includes('черепах')) return '🐢';
  if (n.includes('богомол')) return '🦗';
  if (n.includes('летуч') || n.includes('мышь')) return '🦇';
  if (n.includes('коз')) return '🐐';
  if (n.includes('гиен')) return '🦊';
  if (n.includes('саламандр')) return '🦎';
  if (n.includes('игуан')) return '🦖';
  if (n.includes('пёс') || n.includes('собак')) return '🐕';
  if (n.includes('лягуш')) return '🐸';
  if (n.includes('кошка')) return '🐈';
  if (n.includes('енот')) return '🦝';
  if (n.includes('ворон')) return '🐦‍⬛';
  if (n.includes('крот')) return '🐾';
  if (n.includes('карп') || n.includes('кои')) return '🐠';
  if (n.includes('феникс')) return '🦅';
  if (n.includes('рысь')) return '🐆';
  if (n.includes('грифон')) return '🦁';
  if (n.includes('гонч')) return '🐕‍🦺';
  if (n.includes('голем')) return '🗿';
  if (n.includes('палад')) return '🛡️';
  if (n.includes('ведьм')) return '🧙';
  if (n.includes('трол')) return '👹';
  if (n.includes('ассас')) return '🗡️';
  if (n.includes('энт')) return '🌳';
  if (n.includes('огонёк') || n.includes('огонек')) return '🕯️';
  if (n.includes('преслед')) return '👤';
  if (n.includes('всад')) return '🏇';
  if (n.includes('дрейк') || n.includes('дракон') || kind === 'dragon') return '🐉';
  if (n.includes('великан')) return '🧊';
  if (n.includes('лич')) return '💀';
  if (n.includes('серафим')) return '😇';
  if (n.includes('друид')) return '🧝';
  if (n.includes('пустот')) return '🧿';
  if (n.includes('демон')) return '😈';
  if (n.includes('рок')) return '⚡';
  if (n.includes('титан')) return '🌋';
  if (n.includes('гидра')) return '🐲';
  if (n.includes('сфинкс')) return '🦁';
  if (n.includes('древа') || n.includes('древ')) return '🌲';
  if (n.includes('левиаф')) return '🐋';
  // fallback by kind
  if (kind === 'undead') return '💀';
  if (kind === 'construct') return '⚙️';
  if (kind === 'demon') return '😈';
  if (kind === 'spirit') return '👻';
  if (kind === 'mythic') return '⭐';
  return '🐾';
}

function parseCatalog(text) {
  // Very small parser: finds blocks with id/name/rarity/element/kind/hp/power/speed
  const blocks = [];
  const re = /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*rarity:\s*'([^']+)'\s*,\s*element:\s*'([^']+)'\s*,\s*kind:\s*'([^']+)'\s*,\s*hp:\s*(\d+)\s*,\s*power:\s*(\d+)\s*,\s*speed:\s*(\d+)/gms;
  let m;
  while ((m = re.exec(text))) {
    blocks.push({
      id: m[1],
      name: m[2],
      rarity: m[3],
      element: m[4],
      kind: m[5],
      hp: Number(m[6]),
      power: Number(m[7]),
      speed: Number(m[8]),
    });
  }
  return blocks;
}

function svgForCard(card) {
  const { a, b, stroke, neon } = rarityColors(card.rarity);
  const icon = elementIcon(card.element);
  const emoji = pickEmoji(card);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}" stop-opacity="1"/>
      <stop offset="1" stop-color="${b}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="nebula" cx="50%" cy="42%" r="60%">
      <stop offset="0" stop-color="${neon}" stop-opacity="0.45"/>
      <stop offset="0.45" stop-color="${a}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="holo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${stroke}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${stroke}" stop-opacity="0.36"/>
      <stop offset="1" stop-color="${stroke}" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="36" y="36" rx="28" ry="28" width="440" height="440" fill="url(#bg)" stroke="${stroke}" stroke-width="6"/>
  <rect x="58" y="58" rx="22" ry="22" width="396" height="396" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
  <rect x="58" y="58" rx="22" ry="22" width="396" height="396" fill="url(#nebula)"/>

  <!-- Cyberpunk horizon grid -->
  <g opacity="0.26" stroke="${neon}" stroke-width="1">
    <path d="M80 352 H432"/>
    <path d="M94 382 H418"/>
    <path d="M116 410 H396"/>
    <path d="M256 346 L102 438"/>
    <path d="M256 346 L410 438"/>
    <path d="M220 346 L188 438"/>
    <path d="M292 346 L324 438"/>
  </g>

  <!-- Circuit accents -->
  <g opacity="0.52" stroke="${stroke}" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M82 154 H130 V128 H168"/>
    <path d="M430 154 H382 V128 H344"/>
    <path d="M92 320 H138 V346 H176"/>
    <path d="M420 320 H374 V346 H336"/>
  </g>
  <g fill="${neon}" opacity="0.8">
    <circle cx="168" cy="128" r="5"/>
    <circle cx="344" cy="128" r="5"/>
    <circle cx="176" cy="346" r="5"/>
    <circle cx="336" cy="346" r="5"/>
    <circle cx="112" cy="94" r="2"/>
    <circle cx="196" cy="86" r="2"/>
    <circle cx="376" cy="98" r="2"/>
    <circle cx="406" cy="246" r="2"/>
    <circle cx="110" cy="252" r="2"/>
  </g>

  <circle cx="116" cy="116" r="34" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  <text x="116" y="128" text-anchor="middle" font-size="34" font-family="system-ui,Segoe UI,Apple Color Emoji,Noto Color Emoji" fill="#fff">${esc(icon)}</text>

  <!-- Main creature, neon hologram style -->
  <ellipse cx="256" cy="326" rx="108" ry="26" fill="${neon}" opacity="0.18" filter="url(#softGlow)"/>
  <circle cx="256" cy="235" r="110" fill="${stroke}" opacity="0.08" filter="url(#softGlow)"/>
  <text x="256" y="292" text-anchor="middle" font-size="156" font-family="system-ui,Segoe UI,Apple Color Emoji,Noto Color Emoji" fill="#fff" filter="url(#glow)">${esc(emoji)}</text>
  <path d="M96 228 C168 190 344 190 416 228" stroke="url(#holo)" stroke-width="5" fill="none" opacity="0.7"/>
  <path d="M96 258 C168 296 344 296 416 258" stroke="url(#holo)" stroke-width="4" fill="none" opacity="0.48"/>

  <text x="256" y="372" text-anchor="middle" font-size="28" font-weight="800" font-family="system-ui,Segoe UI" fill="#e2e8f0">${esc(card.name)}</text>
  <text x="256" y="400" text-anchor="middle" font-size="15" font-weight="800" font-family="system-ui,Segoe UI" fill="${stroke}" letter-spacing="2">${esc(card.rarity.toUpperCase())} • ${esc(card.element.toUpperCase())}</text>

  <g font-family="system-ui,Segoe UI" font-size="20" font-weight="700" fill="#e2e8f0" opacity="0.95">
    <text x="78" y="438">HP ${card.hp}</text>
    <text x="210" y="438">PWR ${card.power}</text>
    <text x="360" y="438">SPD ${card.speed}</text>
  </g>
</svg>
`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const text = await readFile(catalogPath, 'utf8');
  const cards = parseCatalog(text);
  if (cards.length !== 68) {
    console.warn(`Expected 68 cards, parsed ${cards.length}. Still generating whatever was parsed.`);
  }
  await Promise.all(
    cards.map(async (c) => {
      const svg = svgForCard(c);
      const svgPath = path.join(outDir, `${c.id}.svg`);
      const webpPath = path.join(outDir, `${c.id}.webp`);
      const webp2xPath = path.join(outDir, `${c.id}@2x.webp`);
      const webp3xPath = path.join(outDir, `${c.id}@3x.webp`);
      await writeFile(svgPath, svg, 'utf8');
      const svgBuffer = Buffer.from(svg, 'utf8');
      await sharp(svgBuffer).resize(512, 512).webp({ quality: 84, effort: 6 }).toFile(webpPath);
      await sharp(svgBuffer).resize(1024, 1024).webp({ quality: 82, effort: 6 }).toFile(webp2xPath);
      await sharp(svgBuffer).resize(1536, 1536).webp({ quality: 80, effort: 6 }).toFile(webp3xPath);
    })
  );
  console.log(`Generated ${cards.length} card SVG + WEBP assets in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

