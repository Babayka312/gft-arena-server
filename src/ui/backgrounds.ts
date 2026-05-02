export const BG_PATHS = {
  home: '/images/bg/home.webp',
  arena: '/images/bg/arena.webp',
  shop: '/images/bg/shop.webp',
  squad: '/images/bg/squad.webp',
  farm: '/images/bg/farm.webp',
  progression: '/images/bg/progression.webp',
  loading: '/images/bg/loading.webp',
  heroSelect: '/images/bg/hero-select.webp',
} as const;

export const BG_TABLET_PATHS = {
  home: '/images/bg/home-1440.webp',
  arena: '/images/bg/arena-1440.webp',
  shop: '/images/bg/shop-1440.webp',
  squad: '/images/bg/squad-1440.webp',
  farm: '/images/bg/farm-1440.webp',
  progression: '/images/bg/progression-1440.webp',
  loading: '/images/bg/loading-1440.webp',
  heroSelect: '/images/bg/hero-select-1440.webp',
} as const;

export const BACKGROUND_PREFETCH = [
  BG_PATHS.home,
  BG_PATHS.arena,
  BG_PATHS.shop,
  BG_PATHS.squad,
] as const;

const LEGACY_TO_BG: Record<string, keyof typeof BG_PATHS> = {
  '/images/backgrounds/home-bg.png': 'home',
  '/images/backgrounds/arena-bg.png': 'arena',
  '/images/backgrounds/team-bg.png': 'squad',
  '/images/backgrounds/farm-bg.png': 'farm',
  '/images/backgrounds/progression-bg.png': 'progression',
  '/images/backgrounds/loading-bg.png': 'loading',
  '/images/backgrounds/hero-select-bg.png': 'heroSelect',
  '/images/backgrounds/home-bg.jpg': 'home',
  '/images/backgrounds/arena-bg.jpg': 'arena',
  '/images/backgrounds/team-bg.jpg': 'squad',
  '/images/backgrounds/farm-bg.jpg': 'farm',
  '/images/home-bg.jpg': 'home',
  '/images/arena-bg.jpg': 'arena',
  '/images/team-bg.jpg': 'squad',
  '/images/farm-bg.jpg': 'farm',
};

export function resolveBackgroundPath(path: string): string {
  if (path in LEGACY_TO_BG) {
    return BG_PATHS[LEGACY_TO_BG[path]];
  }
  if (path.startsWith('/images/bg/')) {
    return path;
  }
  return BG_PATHS.home;
}

export function resolveTabletBackgroundPath(path: string): string {
  if (path in LEGACY_TO_BG) {
    return BG_TABLET_PATHS[LEGACY_TO_BG[path]];
  }
  if (path.startsWith('/images/bg/')) {
    return path.replace('.webp', '-1440.webp');
  }
  return BG_TABLET_PATHS.home;
}
