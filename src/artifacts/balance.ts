import type { ArtifactBonusKey, ArtifactRarity, ArtifactStats, ArtifactType, CraftRecipe } from './types';

export const ARTIFACT_TYPES: ArtifactType[] = ['weapon', 'armor', 'accessory', 'relic'];
export const ARTIFACT_RARITIES: ArtifactRarity[] = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  weapon: 'Оружие',
  armor: 'Броня',
  accessory: 'Аксессуар',
  relic: 'Реликвия',
};

export const ARTIFACT_TYPE_EMOJIS: Record<ArtifactType, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '📿',
  relic: '✨',
};

export const BONUS_LABELS: Record<ArtifactBonusKey, string> = {
  power: 'Сила',
  hp: 'HP',
  critChance: 'Крит',
  critDamage: 'Крит. урон',
  materialFind: 'Материалы',
};

export const EMPTY_ARTIFACT_STATS: ArtifactStats = {
  power: 0,
  hp: 0,
  critChance: 0,
  critDamage: 0,
  materialFind: 0,
};

export const RARITY_CONFIG: Record<ArtifactRarity, {
  label: string;
  color: string;
  maxLevel: number;
  powerMultiplier: number;
  quality: [number, number];
  secondaryCount: number;
  dismantleMaterials: number;
}> = {
  Common: { label: 'Common', color: '#94a3b8', maxLevel: 5, powerMultiplier: 1, quality: [45, 68], secondaryCount: 0, dismantleMaterials: 8 },
  Rare: { label: 'Rare', color: '#38bdf8', maxLevel: 8, powerMultiplier: 1.3, quality: [58, 78], secondaryCount: 1, dismantleMaterials: 18 },
  Epic: { label: 'Epic', color: '#a855f7', maxLevel: 12, powerMultiplier: 1.75, quality: [68, 88], secondaryCount: 2, dismantleMaterials: 38 },
  Legendary: { label: 'Legendary', color: '#f59e0b', maxLevel: 16, powerMultiplier: 2.35, quality: [78, 96], secondaryCount: 3, dismantleMaterials: 80 },
  Mythic: { label: 'Mythic', color: '#ec4899', maxLevel: 20, powerMultiplier: 3.2, quality: [88, 100], secondaryCount: 4, dismantleMaterials: 160 },
};

export const CRAFT_RECIPES: Record<ArtifactType, CraftRecipe> = {
  weapon: {
    type: 'weapon',
    label: 'Оружие',
    description: 'Главный источник силы и критического урона.',
    basePower: 18,
    cost: { gft: 500, materials: 50 },
    primaryBonus: 'power',
    secondaryPool: ['critChance', 'critDamage', 'hp'],
    rarityWeights: { Common: 38, Rare: 34, Epic: 20, Legendary: 7, Mythic: 1 },
  },
  armor: {
    type: 'armor',
    label: 'Броня',
    description: 'Повышает выживаемость и стабильность в боях.',
    basePower: 14,
    cost: { gft: 400, materials: 40 },
    primaryBonus: 'hp',
    secondaryPool: ['power', 'critDamage', 'materialFind'],
    rarityWeights: { Common: 42, Rare: 34, Epic: 18, Legendary: 5, Mythic: 1 },
  },
  accessory: {
    type: 'accessory',
    label: 'Аксессуар',
    description: 'Гибкий слот для критов, добычи и точечной силы.',
    basePower: 12,
    cost: { gft: 300, materials: 30 },
    primaryBonus: 'critChance',
    secondaryPool: ['power', 'hp', 'critDamage', 'materialFind'],
    rarityWeights: { Common: 45, Rare: 33, Epic: 16, Legendary: 5, Mythic: 1 },
  },
  relic: {
    type: 'relic',
    label: 'Реликвия',
    description: 'Дорогой крафт с лучшим шансом редких свойств.',
    basePower: 24,
    cost: { gft: 1000, materials: 100 },
    primaryBonus: 'materialFind',
    secondaryPool: ['power', 'hp', 'critChance', 'critDamage'],
    rarityWeights: { Rare: 34, Epic: 38, Legendary: 22, Mythic: 6 },
  },
};

export function getBonusValue(key: ArtifactBonusKey, rarity: ArtifactRarity, quality: number, basePower: number): number {
  const rarityMultiplier = RARITY_CONFIG[rarity].powerMultiplier;
  const qualityMultiplier = quality / 100;
  const raw = basePower * rarityMultiplier * qualityMultiplier;

  if (key === 'hp') return Math.round(raw * 9);
  if (key === 'critChance') return Math.round((2 + raw * 0.18) * 10) / 10;
  if (key === 'critDamage') return Math.round((8 + raw * 0.55) * 10) / 10;
  if (key === 'materialFind') return Math.round((3 + raw * 0.22) * 10) / 10;
  return Math.round(raw);
}

export function getUpgradeCost(level: number, rarity: ArtifactRarity) {
  const rarityIndex = ARTIFACT_RARITIES.indexOf(rarity) + 1;
  return {
    gft: 120 + level * 85 * rarityIndex,
    materials: 12 + level * 6 * rarityIndex,
  };
}
