import type { ArtifactRarity, ArtifactType } from './types';

/** Слой арта как у карточки отряда (`/images/cards/*.png`), без редкости — её даёт рамка. */
export function getArtifactTypeArtUrl(type: ArtifactType): string {
  return `/images/artifacts/art/${type}.svg`;
}

/** Для preload / спрайтов при необходимости */
export function getArtifactPortraitUrlsForTypes(types: ArtifactType[]): string[] {
  return [...new Set(types)].map(getArtifactTypeArtUrl);
}

/** Совместимость: rarity уже учитывается рамкой в UI */
export function getArtifactPortraitUrl(type: ArtifactType, _rarity: ArtifactRarity): string {
  return getArtifactTypeArtUrl(type);
}
