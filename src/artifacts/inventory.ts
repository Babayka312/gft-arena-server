import { EMPTY_ARTIFACT_STATS, RARITY_CONFIG, getUpgradeCost } from './balance';
import type { Artifact, ArtifactBonus, ArtifactSlot, ArtifactStats, ArtifactType } from './types';

export type EquippedArtifacts = Record<ArtifactSlot, string | null>;

export const EMPTY_EQUIPPED_ARTIFACTS: EquippedArtifacts = {
  weapon: null,
  armor: null,
  accessory1: null,
  accessory2: null,
  relic: null,
};

export function getDefaultSlotForArtifact(type: ArtifactType, equipped: EquippedArtifacts): ArtifactSlot {
  if (type === 'accessory') return equipped.accessory1 ? 'accessory2' : 'accessory1';
  return type;
}

export function getEquippedArtifactIds(equipped: EquippedArtifacts) {
  return Object.values(equipped).filter(Boolean) as string[];
}

export function isArtifactEquipped(artifactId: string, equipped: EquippedArtifacts) {
  return getEquippedArtifactIds(equipped).includes(artifactId);
}

export function equipArtifact(equipped: EquippedArtifacts, artifact: Artifact, preferredSlot?: ArtifactSlot): EquippedArtifacts {
  const slot = preferredSlot ?? getDefaultSlotForArtifact(artifact.type, equipped);
  return { ...equipped, [slot]: artifact.id };
}

export function unequipArtifact(equipped: EquippedArtifacts, slot: string): EquippedArtifacts {
  return { ...equipped, [slot]: null };
}

function addBonus(stats: ArtifactStats, bonus: ArtifactBonus, levelMultiplier: number) {
  stats[bonus.key] += bonus.value * levelMultiplier;
}

export function calculateArtifactStats(artifacts: Artifact[], equipped: EquippedArtifacts): ArtifactStats {
  const stats = { ...EMPTY_ARTIFACT_STATS };
  const byId = new Map(artifacts.map(artifact => [artifact.id, artifact]));

  for (const artifactId of getEquippedArtifactIds(equipped)) {
    const artifact = byId.get(artifactId);
    if (!artifact) continue;

    const levelMultiplier = 1 + (artifact.level - 1) * 0.12;
    stats.power += artifact.power * levelMultiplier;
    addBonus(stats, artifact.primaryBonus, levelMultiplier);
    artifact.secondaryBonuses.forEach(bonus => addBonus(stats, bonus, levelMultiplier));
  }

  return {
    power: Math.round(stats.power),
    hp: Math.round(stats.hp),
    critChance: Math.round(stats.critChance * 10) / 10,
    critDamage: Math.round(stats.critDamage * 10) / 10,
    materialFind: Math.round(stats.materialFind * 10) / 10,
  };
}

export function upgradeArtifactLevel(artifact: Artifact): Artifact {
  if (artifact.level >= artifact.maxLevel) return artifact;
  return {
    ...artifact,
    level: artifact.level + 1,
    power: Math.round(artifact.power * 1.1),
    primaryBonus: {
      ...artifact.primaryBonus,
      value: Math.round(artifact.primaryBonus.value * 1.08 * 10) / 10,
    },
    secondaryBonuses: artifact.secondaryBonuses.map(bonus => ({
      ...bonus,
      value: Math.round(bonus.value * 1.06 * 10) / 10,
    })),
  };
}

export function getDismantleReward(artifact: Artifact) {
  const base = RARITY_CONFIG[artifact.rarity].dismantleMaterials;
  return {
    materials: Math.round(base + artifact.level * base * 0.22),
    gft: Math.round(base * 3 + artifact.power * 2),
  };
}

export function normalizeEquippedArtifacts(value: Partial<Record<string, string | null>> | null | undefined): EquippedArtifacts {
  return {
    ...EMPTY_EQUIPPED_ARTIFACTS,
    ...(value ?? {}),
  };
}

export { getUpgradeCost };
