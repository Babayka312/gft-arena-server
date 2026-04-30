/**
 * Ультимейт главного героя в карточном бою 3×3 (бонусный ход, не съедает очередь карт).
 * Логика должна совпадать с server/heroUltimate.mjs (анти-чит PvP).
 */

export type HeroUltPattern = 'fire_aoe' | 'earth_shield' | 'air_heal' | 'water_burst';

/** (heroId - 1) % 4 → стихия пачки зодиака для ульты */
export function getHeroUltPattern(heroId: number): HeroUltPattern {
  const i = ((Math.floor(heroId) || 1) - 1) % 4;
  if (i === 0) return 'fire_aoe';
  if (i === 1) return 'earth_shield';
  if (i === 2) return 'air_heal';
  return 'water_burst';
}

export function getHeroUltPower(hero: { basePower: number; level: number; stars: number }): number {
  const base = Number(hero.basePower) || 0;
  const lvl = Math.max(1, Math.floor(Number(hero.level) || 1));
  const stars = Math.max(1, Math.floor(Number(hero.stars) || 1));
  return Math.max(12, Math.floor(base + lvl * 6 + stars * 8));
}

export function getHeroUltimateTitle(pattern: HeroUltPattern): string {
  switch (pattern) {
    case 'fire_aoe':
      return 'Звёздный залп';
    case 'earth_shield':
      return 'Каменный обет';
    case 'air_heal':
      return 'Поток жизни';
    case 'water_burst':
      return 'Ледяной приговор';
    default:
      return 'Ультимейт';
  }
}
