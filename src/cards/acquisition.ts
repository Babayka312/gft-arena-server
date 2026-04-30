import { CHARACTER_CARDS, type CardRarity, type CharacterCard } from './catalog';

export type CardPackType = 'basic' | 'premium' | 'mythic';

export type CardPackConfig = {
  name: string;
  costCoins?: number;
  costCrystals?: number;
  cards: number;
  rarityWeights: Partial<Record<CardRarity, number>>;
};

export type CardAcquisitionResult = {
  card: CharacterCard;
  isDuplicate: boolean;
  shards: number;
};

export const CARD_PACKS: Record<CardPackType, CardPackConfig> = {
  basic: {
    name: 'Обычный набор',
    costCoins: 1200,
    cards: 3,
    rarityWeights: { Common: 72, Rare: 22, Epic: 5, Legendary: 1 },
  },
  premium: {
    name: 'Элитный набор',
    costCrystals: 1800,
    cards: 5,
    rarityWeights: { Common: 42, Rare: 36, Epic: 16, Legendary: 5, Mythic: 1 },
  },
  mythic: {
    name: 'Мифический набор',
    costCrystals: 4500,
    cards: 6,
    rarityWeights: { Rare: 48, Epic: 34, Legendary: 14, Mythic: 4 },
  },
};

export const CARD_DUPLICATE_SHARDS: Record<CardRarity, number> = {
  Common: 8,
  Rare: 20,
  Epic: 55,
  Legendary: 150,
  Mythic: 420,
};

export const CARD_CRAFT_COST: Record<CardRarity, number> = {
  Common: 35,
  Rare: 90,
  Epic: 260,
  Legendary: 760,
  Mythic: 1800,
};

export const CARD_RARITY_ORDER: Record<CardRarity, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5,
};

export const CARD_RARITY_UPGRADE_COST = 5;

/** Сжигаем 5 копий карты, +1 звезда (1..5). Должно совпадать с server/index.mjs CARD_STAR_UP_COST. */
export const CARD_STAR_UP_COST = 5;
export const CARD_STAR_MAX = 5;

export const CARD_RARITY_UPGRADE_TARGET: Partial<Record<CardRarity, CardRarity>> = {
  Common: 'Rare',
  Rare: 'Epic',
  Epic: 'Legendary',
  Legendary: 'Mythic',
};

function rollWeightedRarity(weights: Partial<Record<CardRarity, number>>): CardRarity {
  const entries = Object.entries(weights) as Array<[CardRarity, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return entries[entries.length - 1]?.[0] ?? 'Common';
}

function randomCardByRarity(rarity: CardRarity): CharacterCard {
  const pool = CHARACTER_CARDS.filter(card => card.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] ?? CHARACTER_CARDS[0];
}

export function openCardPack(packType: CardPackType, collection: Record<string, number>): CardAcquisitionResult[] {
  const pack = CARD_PACKS[packType];
  return Array.from({ length: pack.cards }, () => {
    const card = randomCardByRarity(rollWeightedRarity(pack.rarityWeights));
    const isDuplicate = (collection[card.id] ?? 0) > 0;
    return {
      card,
      isDuplicate,
      shards: isDuplicate ? CARD_DUPLICATE_SHARDS[card.rarity] : 0,
    };
  });
}

export function getCraftableCards(collection: Record<string, number>, rarity?: CardRarity) {
  return CHARACTER_CARDS
    .filter(card => (collection[card.id] ?? 0) === 0)
    .filter(card => !rarity || card.rarity === rarity)
    .sort((a, b) => {
      const rarityDiff = CARD_RARITY_ORDER[b.rarity] - CARD_RARITY_ORDER[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'ru');
    });
}

export function getRarityUpgradePool(collection: Record<string, number>, rarity: CardRarity) {
  return CHARACTER_CARDS
    .filter(card => card.rarity === rarity)
    .filter(card => (collection[card.id] ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function rollRarityUpgradeReward(sourceRarity: CardRarity): CharacterCard | null {
  const targetRarity = CARD_RARITY_UPGRADE_TARGET[sourceRarity];
  if (!targetRarity) return null;
  return randomCardByRarity(targetRarity);
}
