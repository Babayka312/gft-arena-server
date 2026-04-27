import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'public', 'images', 'frames');

const RARITIES = /** @type {const} */ (['Common', 'Rare', 'Epic', 'Legendary', 'Mythic']);

function colors(rarity) {
  switch (rarity) {
    case 'Common':
      return { stroke: '#64748b', glow: '#94a3b8', a: '#1f2937', b: '#0b1220' };
    case 'Rare':
      return { stroke: '#60a5fa', glow: '#93c5fd', a: '#1d4ed8', b: '#0b1220' };
    case 'Epic':
      return { stroke: '#c084fc', glow: '#e9d5ff', a: '#7c3aed', b: '#0b1220' };
    case 'Legendary':
      return { stroke: '#fbbf24', glow: '#fde68a', a: '#f59e0b', b: '#0b1220' };
    case 'Mythic':
      return { stroke: '#fb7185', glow: '#fecdd3', a: '#ef4444', b: '#0b1220' };
    default:
      return { stroke: '#64748b', glow: '#94a3b8', a: '#1f2937', b: '#0b1220' };
  }
}

function frameSvg(rarity) {
  const { stroke, glow, a, b } = colors(rarity);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${b}" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <mask id="cut">
      <rect width="512" height="512" fill="#fff"/>
      <rect x="76" y="76" width="360" height="360" rx="26" ry="26" fill="#000"/>
    </mask>
  </defs>

  <!-- Transparent center: we draw only the frame using mask -->
  <g mask="url(#cut)">
    <rect x="36" y="36" width="440" height="440" rx="34" ry="34" fill="url(#rim)" opacity="0.9"/>
    <rect x="44" y="44" width="424" height="424" rx="30" ry="30" fill="none" stroke="${stroke}" stroke-width="10" filter="url(#glow)"/>
    <rect x="58" y="58" width="396" height="396" rx="26" ry="26" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

    <!-- Corner ornaments -->
    <g opacity="0.9">
      <path d="M70 140 Q70 70 140 70" fill="none" stroke="${glow}" stroke-width="6" stroke-linecap="round"/>
      <path d="M372 70 Q442 70 442 140" fill="none" stroke="${glow}" stroke-width="6" stroke-linecap="round"/>
      <path d="M70 372 Q70 442 140 442" fill="none" stroke="${glow}" stroke-width="6" stroke-linecap="round"/>
      <path d="M372 442 Q442 442 442 372" fill="none" stroke="${glow}" stroke-width="6" stroke-linecap="round"/>
    </g>

    <!-- Small gems -->
    <g>
      <circle cx="256" cy="54" r="10" fill="${stroke}" filter="url(#glow)"/>
      <circle cx="256" cy="458" r="10" fill="${stroke}" filter="url(#glow)"/>
      <circle cx="54" cy="256" r="10" fill="${stroke}" filter="url(#glow)"/>
      <circle cx="458" cy="256" r="10" fill="${stroke}" filter="url(#glow)"/>
    </g>
  </g>
</svg>
`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await Promise.all(
    RARITIES.map(async (r) => {
      const svg = frameSvg(r);
      const outPath = path.join(outDir, `rarity-${r.toLowerCase()}.svg`);
      await writeFile(outPath, svg, 'utf8');
    })
  );
  console.log(`Generated ${RARITIES.length} rarity frames in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

