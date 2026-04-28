/**
 * Опыт героя и очки прокачки. Формулы должны совпадать с server/heroProgress.mjs
 */

/** Сколько очков прокачки выдаётся за каждый новый уровень героя. */
export const HERO_STAT_POINTS_PER_LEVEL = 3;

/** Опыт, необходимый для перехода с уровня L на L+1 (L >= 1). */
export function getHeroXpToNextLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return 80 + L * 22;
}

export type MainHeroWithProgress = {
  level: number;
  exp: number;
  statPoints: number;
  basePower: number;
  stars: number;
};

/**
 * Начисляет опыт, поднимает уровни и выдаёт очки прокачки.
 * Возвращает обновлённого героя и строки для UI/модалки.
 */
export function applyHeroExpGain(hero: MainHeroWithProgress, gainedXp: number): { hero: MainHeroWithProgress; levelUpLines: string[] } {
  const levelUpLines: string[] = [];
  let level = Math.max(1, Math.floor(hero.level));
  let exp = Math.max(0, Math.floor(hero.exp));
  let statPoints = Math.max(0, Math.floor(hero.statPoints));
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
    hero: { ...hero, level, exp, statPoints },
    levelUpLines,
  };
}
