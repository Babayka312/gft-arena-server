/** Макс. энергия и тик восстановления (синхронно с server/index.mjs). */
export const MAX_ENERGY = 100;
export const MS_PER_ENERGY = 5 * 60 * 1000;

/** Стоимость боя 3×3: PvP / PvE обычный уровень / босс этапа / обучение. */
export const ENERGY_COST_PVP = 8;
export const ENERGY_COST_PVE = 6;
export const ENERGY_COST_PVE_BOSS = 12;
export const ENERGY_COST_PVE_TRAINING = 0;

export function getBattleEnergyCost(
  mode: 'pvp' | 'pve',
  pveContext?: { isBoss?: boolean; isTraining?: boolean } | null,
): number {
  if (mode === 'pvp') return ENERGY_COST_PVP;
  if (!pveContext) return ENERGY_COST_PVE;
  if (pveContext.isTraining) return ENERGY_COST_PVE_TRAINING;
  if (pveContext.isBoss) return ENERGY_COST_PVE_BOSS;
  return ENERGY_COST_PVE;
}

/**
 * Считает фактическую энергию «на сейчас» по якорю energyRegenAt.
 * Если regenAt <= 0 — якорь «сейчас» (первый запуск / старые сейвы).
 */
export function regenEnergyToNow(
  energy: number,
  energyRegenAt: number,
  now: number,
  maxE: number = MAX_ENERGY,
  msPer: number = MS_PER_ENERGY,
): { energy: number; energyRegenAt: number } {
  let e = Math.max(0, Math.min(maxE, Math.floor(energy)));
  let t = Number(energyRegenAt);
  if (!Number.isFinite(t) || t <= 0) t = now;
  if (e >= maxE) {
    return { energy: maxE, energyRegenAt: now };
  }
  const elapsed = now - t;
  if (elapsed < 0) {
    return { energy: e, energyRegenAt: t };
  }
  const gained = Math.floor(elapsed / msPer);
  const e2 = Math.min(maxE, e + gained);
  const t2 = t + gained * msPer;
  return { energy: e2, energyRegenAt: e2 >= maxE ? now : t2 };
}
