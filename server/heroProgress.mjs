/**
 * Синхронно с src/game/heroProgress.ts
 */

export const HERO_STAT_POINTS_PER_LEVEL = 3;

export function getHeroXpToNextLevel(level) {
  const L = Math.max(1, Math.floor(level));
  return 80 + L * 22;
}

/**
 * @param {object} hero — mainHero из прогресса
 * @param {number} gainedXp
 * @returns {{ hero: object, levelUpLines: string[] }}
 */
export function applyHeroExpGain(hero, gainedXp) {
  if (!hero || typeof hero !== 'object') {
    return { hero, levelUpLines: [] };
  }
  const levelUpLines = [];
  let level = Math.max(1, Math.floor(Number(hero.level) || 1));
  let exp = Math.max(0, Math.floor(Number(hero.exp) || 0));
  let statPoints = Math.max(0, Math.floor(Number(hero.statPoints) || 0));
  let add = Math.max(0, Math.floor(gainedXp));

  while (add > 0) {
    const need = getHeroXpToNextLevel(level);
    const room = need - exp;
    if (add < room) {
      exp += add;
      break;
    }
    add -= room;
    level += 1;
    exp = 0;
    statPoints += HERO_STAT_POINTS_PER_LEVEL;
    levelUpLines.push(`Уровень ${level}! +${HERO_STAT_POINTS_PER_LEVEL} оч. прокачки`);
  }

  return {
    hero: {
      ...hero,
      level,
      exp,
      statPoints,
    },
    levelUpLines,
  };
}
