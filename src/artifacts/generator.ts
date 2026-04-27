import { ARTIFACT_RARITIES, ARTIFACT_TYPE_EMOJIS, ARTIFACT_TYPE_LABELS, CRAFT_RECIPES, RARITY_CONFIG, getBonusValue } from './balance';
import type { Artifact, ArtifactBonus, ArtifactBonusKey, ArtifactRarity, ArtifactType } from './types';

type ArtifactSource = Artifact['createdFrom'];

const prefixes: Record<ArtifactRarity, string[]> = {
  Common: ['Полевой', 'Тусклый', 'Старый'],
  Rare: ['Звёздный', 'Грозовой', 'Кристальный'],
  Epic: ['Астральный', 'Пылающий', 'Теневой'],
  Legendary: ['Древний', 'Небесный', 'Императорский'],
  Mythic: ['Мифический', 'Первозданный', 'Бессмертный'],
};

const suffixes: Record<ArtifactType, string[]> = {
  weapon: ['клинок', 'молот', 'посох'],
  armor: ['панцирь', 'доспех', 'щит'],
  accessory: ['амулет', 'перстень', 'браслет'],
  relic: ['осколок', 'талисман', 'сердце'],
};

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pickWeightedRarity(weights: Partial<Record<ArtifactRarity, number>>): ArtifactRarity {
  const total = ARTIFACT_RARITIES.reduce((sum, rarity) => sum + (weights[rarity] ?? 0), 0);
  let roll = Math.random() * total;

  for (const rarity of ARTIFACT_RARITIES) {
    roll -= weights[rarity] ?? 0;
    if (roll <= 0) return rarity;
  }

  return 'Common';
}

function pickSecondaryBonuses(pool: ArtifactBonusKey[], count: number, rarity: ArtifactRarity, quality: number, basePower: number): ArtifactBonus[] {
  const available = [...pool];
  const bonuses: ArtifactBonus[] = [];

  while (available.length > 0 && bonuses.length < count) {
    const idx = randomInt(0, available.length - 1);
    const key = available.splice(idx, 1)[0];
    bonuses.push({
      key,
      value: Math.max(1, Math.round(getBonusValue(key, rarity, quality, basePower) * 0.55 * 10) / 10),
    });
  }

  return bonuses;
}

export function createArtifact(type: ArtifactType, source: ArtifactSource = 'craft', rarityOverride?: ArtifactRarity): Artifact {
  const recipe = CRAFT_RECIPES[type];
  const rarity = rarityOverride ?? pickWeightedRarity(recipe.rarityWeights);
  const config = RARITY_CONFIG[rarity];
  const quality = randomInt(config.quality[0], config.quality[1]);
  const power = Math.round(recipe.basePower * config.powerMultiplier * (quality / 100));
  const prefix = prefixes[rarity][randomInt(0, prefixes[rarity].length - 1)];
  const suffix = suffixes[type][randomInt(0, suffixes[type].length - 1)];

  return {
    id: `${type}-${source}-${Date.now()}-${randomInt(1000, 9999)}`,
    name: `${prefix} ${suffix}`,
    type,
    rarity,
    power,
    level: 1,
    emoji: ARTIFACT_TYPE_EMOJIS[type],
    quality,
    primaryBonus: {
      key: recipe.primaryBonus,
      value: getBonusValue(recipe.primaryBonus, rarity, quality, recipe.basePower),
    },
    secondaryBonuses: pickSecondaryBonuses(recipe.secondaryPool, config.secondaryCount, rarity, quality, recipe.basePower),
    maxLevel: config.maxLevel,
    createdFrom: source,
    locked: false,
  };
}

export function createStarterArtifacts(): Artifact[] {
  return [
    createArtifact('weapon', 'starter', 'Epic'),
    createArtifact('armor', 'starter', 'Rare'),
  ].map((artifact, index) => ({
    ...artifact,
    id: index === 0 ? 'wep1' : 'arm1',
    name: index === 0 ? 'Меч Огня' : 'Броня Звёзд',
  }));
}

export function createPveArtifact(chapter: number, isBoss: boolean): Artifact {
  const type = (['weapon', 'armor', 'accessory', 'relic'] as ArtifactType[])[randomInt(0, 3)];
  const rarityBonus = Math.min(18, Math.max(0, chapter - 1));
  const rarityWeights: Partial<Record<ArtifactRarity, number>> = isBoss
    ? { Rare: 40 - rarityBonus, Epic: 38, Legendary: 18 + rarityBonus, Mythic: 4 }
    : { Common: 34, Rare: 40, Epic: 20 + Math.floor(rarityBonus / 2), Legendary: 6 };
  const rarity = pickWeightedRarity(rarityWeights);

  return createArtifact(type, 'pve', rarity);
}

export function getArtifactTypeLabel(type: ArtifactType) {
  return ARTIFACT_TYPE_LABELS[type];
}
