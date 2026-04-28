import type { Artifact, ArtifactRarity, ArtifactType } from './types';

type RarityPalette = {
  bg1: string;
  bg2: string;
  glow: string;
  stroke: string;
  core: string;
  accent: string;
};

const RARITY_PALETTES: Record<ArtifactRarity, RarityPalette> = {
  Common: {
    bg1: '#1f2937',
    bg2: '#475569',
    glow: '#94a3b8',
    stroke: '#cbd5e1',
    core: '#e2e8f0',
    accent: '#94a3b8',
  },
  Rare: {
    bg1: '#082f49',
    bg2: '#0ea5e9',
    glow: '#38bdf8',
    stroke: '#bae6fd',
    core: '#e0f2fe',
    accent: '#38bdf8',
  },
  Epic: {
    bg1: '#2e1065',
    bg2: '#7e22ce',
    glow: '#a855f7',
    stroke: '#e9d5ff',
    core: '#f3e8ff',
    accent: '#c084fc',
  },
  Legendary: {
    bg1: '#451a03',
    bg2: '#d97706',
    glow: '#f59e0b',
    stroke: '#fde68a',
    core: '#fffbeb',
    accent: '#facc15',
  },
  Mythic: {
    bg1: '#4a044e',
    bg2: '#db2777',
    glow: '#ec4899',
    stroke: '#fbcfe8',
    core: '#fdf2f8',
    accent: '#fb7185',
  },
};

function artifactShape(type: ArtifactType, palette: RarityPalette) {
  if (type === 'weapon') {
    return `
      <path d="M74 18 L90 34 L49 75 L38 78 L41 67 Z" fill="${palette.core}" stroke="${palette.stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M39 73 L27 85" stroke="${palette.stroke}" stroke-width="8" stroke-linecap="round"/>
      <path d="M35 62 L51 78" stroke="${palette.accent}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="27" cy="85" r="7" fill="${palette.accent}" stroke="${palette.stroke}" stroke-width="3"/>
    `;
  }
  if (type === 'armor') {
    return `
      <path d="M32 23 C41 31 55 31 64 23 C71 31 76 41 76 53 C76 73 63 86 48 94 C33 86 20 73 20 53 C20 41 25 31 32 23 Z" fill="${palette.core}" stroke="${palette.stroke}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M48 32 L48 85" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round"/>
      <path d="M30 48 C39 53 57 53 66 48" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M29 63 C39 68 57 68 67 63" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" fill="none"/>
    `;
  }
  if (type === 'accessory') {
    return `
      <circle cx="48" cy="48" r="28" fill="none" stroke="${palette.stroke}" stroke-width="8"/>
      <circle cx="48" cy="48" r="18" fill="${palette.core}" stroke="${palette.accent}" stroke-width="4"/>
      <path d="M48 28 L55 44 L72 48 L55 54 L48 70 L41 54 L24 48 L41 44 Z" fill="${palette.accent}" opacity="0.95"/>
      <circle cx="48" cy="48" r="6" fill="${palette.bg1}"/>
    `;
  }
  return `
    <path d="M48 14 L78 44 L48 96 L18 44 Z" fill="${palette.core}" stroke="${palette.stroke}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M48 14 L48 96" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 44 L78 44" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round"/>
    <path d="M33 44 L48 14 L63 44 L48 96 Z" fill="${palette.accent}" opacity="0.32"/>
  `;
}

/**
 * `inline` — для вставки в DOM (Telegram Mini App часто режет data:image/svg+xml в &lt;img&gt;).
 * `dataUrl` — фиксированный размер для data: URL (превью вне DOM).
 */
function artifactSvg(type: ArtifactType, rarity: ArtifactRarity, renderMode: 'inline' | 'dataUrl' = 'dataUrl') {
  const palette = RARITY_PALETTES[rarity];
  const sizeAttrs =
    renderMode === 'inline'
      ? 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"'
      : 'width="192" height="224"';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112" ${sizeAttrs}>
      <defs>
        <radialGradient id="bg" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stop-color="${palette.bg2}"/>
          <stop offset="100%" stop-color="${palette.bg1}"/>
        </radialGradient>
        <filter id="glow" x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .75 0"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect x="5" y="5" width="86" height="102" rx="20" fill="url(#bg)" stroke="${palette.stroke}" stroke-width="3"/>
      <circle cx="48" cy="54" r="38" fill="${palette.glow}" opacity="0.18"/>
      <g filter="url(#glow)">
        ${artifactShape(type, palette)}
      </g>
      <path d="M20 102 C31 95 65 95 76 102" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
      <circle cx="18" cy="18" r="3" fill="${palette.stroke}" opacity="0.75"/>
      <circle cx="78" cy="18" r="3" fill="${palette.stroke}" opacity="0.75"/>
    </svg>
  `;
}

function encodeSvg(svg: string) {
  const compact = svg.replace(/\s+/g, ' ').trim();
  try {
    const b64 = btoa(unescape(encodeURIComponent(compact)));
    return `data:image/svg+xml;base64,${b64}`;
  } catch {
    return `data:image/svg+xml,${encodeURIComponent(compact)}`;
  }
}

const artifactImageCache = new Map<string, string>();

export function getArtifactImageUrl(type: ArtifactType, rarity: ArtifactRarity) {
  const key = `${type}:${rarity}`;
  const cached = artifactImageCache.get(key);
  if (cached) return cached;
  const url = encodeSvg(artifactSvg(type, rarity, 'dataUrl'));
  artifactImageCache.set(key, url);
  return url;
}

/** Полный SVG для inline-рендера (устойчиво в Telegram WKWebView). */
const inlineMarkupCache = new Map<string, string>();

export function getArtifactInlineSvgMarkup(type: ArtifactType, rarity: ArtifactRarity): string {
  const key = `${type}:${rarity}`;
  const cached = inlineMarkupCache.get(key);
  if (cached) return cached;
  const compact = artifactSvg(type, rarity, 'inline').replace(/\s+/g, ' ').trim();
  inlineMarkupCache.set(key, compact);
  return compact;
}

export function getArtifactImageForArtifact(artifact: Pick<Artifact, 'type' | 'rarity'>) {
  return getArtifactImageUrl(artifact.type, artifact.rarity);
}
