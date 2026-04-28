import type { ArtifactRarity, ArtifactType } from './types';
import { publicAssetUrl } from '../utils/publicAssetUrl';

const RARITY_SLUG: Record<ArtifactRarity, string> = {
  Common: 'common',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
  Mythic: 'mythic',
};

/** Уникальный арт по типу + редкости. */
export function getArtifactArtUrl(type: ArtifactType, rarity: ArtifactRarity): string {
  return publicAssetUrl(`images/artifacts/art/${type}-${RARITY_SLUG[rarity]}.png`);
}

/** Универсальный fallback по типу (если редкочной картинки не нашлось на сервере). */
export function getArtifactTypeArtUrl(type: ArtifactType): string {
  return publicAssetUrl(`images/artifacts/art/${type}.png`);
}

export function getArtifactPortraitUrlsForTypes(types: ArtifactType[]): string[] {
  return [...new Set(types)].map(getArtifactTypeArtUrl);
}

/** Совместимость со старыми импортами. */
export function getArtifactPortraitUrl(type: ArtifactType, rarity: ArtifactRarity): string {
  return getArtifactArtUrl(type, rarity);
}
