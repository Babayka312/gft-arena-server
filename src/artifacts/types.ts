export type ArtifactType = 'weapon' | 'armor' | 'accessory' | 'relic';
export type ArtifactRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
export type ArtifactSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2' | 'relic';
export type ArtifactBonusKey = 'power' | 'hp' | 'critChance' | 'critDamage' | 'materialFind';

export interface ArtifactBonus {
  key: ArtifactBonusKey;
  value: number;
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  rarity: ArtifactRarity;
  power: number;
  level: number;
  emoji: string;
  quality: number;
  primaryBonus: ArtifactBonus;
  secondaryBonuses: ArtifactBonus[];
  maxLevel: number;
  createdFrom: 'starter' | 'craft' | 'pve' | 'lootbox' | 'battlepass';
  locked: boolean;
}

export interface ArtifactStats {
  power: number;
  hp: number;
  critChance: number;
  critDamage: number;
  materialFind: number;
}

export interface CraftCost {
  gft: number;
  materials: number;
}

export interface CraftRecipe {
  type: ArtifactType;
  label: string;
  description: string;
  basePower: number;
  cost: CraftCost;
  primaryBonus: ArtifactBonusKey;
  secondaryPool: ArtifactBonusKey[];
  rarityWeights: Partial<Record<ArtifactRarity, number>>;
}
