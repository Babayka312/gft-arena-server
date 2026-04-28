import { publicAssetUrl } from '../utils/publicAssetUrl';

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export function getRarityFrameUrl(rarity: string | null | undefined): string {
  const r = (rarity ?? 'Common') as Rarity;
  const slug =
    r === 'Rare'
      ? 'rare'
      : r === 'Epic'
        ? 'epic'
        : r === 'Legendary'
          ? 'legendary'
          : r === 'Mythic'
            ? 'mythic'
            : 'common';
  return publicAssetUrl(`images/frames/rarity-${slug}.svg`);
}

