import { publicAssetUrl } from '../utils/publicAssetUrl';

export function getCharacterCardImageUrl(cardId: string): string {
  return publicAssetUrl(`images/cards/${cardId}.webp`);
}

export function getCharacterCardImageSrcSet(cardId: string): string {
  return [
    `${publicAssetUrl(`images/cards/${cardId}@2x.webp`)} 2x`,
    `${publicAssetUrl(`images/cards/${cardId}@3x.webp`)} 3x`,
  ].join(', ');
}

