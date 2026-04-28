import { publicAssetUrl } from '../utils/publicAssetUrl';

export function getCharacterCardImageUrl(cardId: string): string {
  return publicAssetUrl(`images/cards/${cardId}.png`);
}

