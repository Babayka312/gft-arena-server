import {
  PVE_BOSS_NAMES,
  PVE_BOSS_PORTRAITS,
  PVE_MOB_NAMES,
  PVE_MOB_PORTRAITS,
} from './pveEnemyFlair';

export interface SquadHero {
  id: number;
  name: string;
  zodiac: string;
  emoji: string;
  image: string;
  rarity: string;
  basePower: number;
  level: number;
  exp: number;
  /** Очки прокачки: выдаются с каждым уровнем, тратятся на силу. */
  statPoints: number;
  stars: number;
}

export interface BattleOpponent {
  id: number;
  name: string;
  emoji: string;
  power: number;
  maxHP: number;
}

export interface BattleState {
  opponent: BattleOpponent;
  playerHP: number;
  opponentHP: number;
  log: string[];
}

export interface PveEnemy {
  id: string;
  name: string;
  /** Публичный URL портрета (SVG/PNG) */
  portrait: string;
  power: number;
  maxHP: number;
  isBoss: boolean;
}

export interface PveBattleState {
  chapter: number;
  level: number;
  enemy: PveEnemy;
  playerHP: number;
  enemyHP: number;
  log: string[];
  isBoss: boolean;
}

export interface CombatStats {
  power: number;
  hp: number;
  critChance: number;
  critDamage: number;
  materialFind: number;
}

export function randomRange(min: number, spread: number) {
  return min + Math.random() * spread;
}

export function randomChance(percent: number) {
  return Math.random() * 100 < percent;
}

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function createCardUid(side: 'player' | 'bot', heroId: string | number, idx: number) {
  return `${side}_${heroId}_${idx}_${Date.now()}`;
}

export function rollCombatDamage(baseDamage: number, stats: CombatStats) {
  const isCrit = randomChance(stats.critChance);
  return {
    damage: Math.floor(baseDamage * (isCrit ? 1 + stats.critDamage / 100 : 1)),
    isCrit,
  };
}

export function rollPveMeleeDamage(stats: CombatStats) {
  return rollCombatDamage(stats.power * randomRange(0.7, 0.8), stats);
}

export function rollPveSkillDamage(stats: CombatStats) {
  return rollCombatDamage(stats.power * 2.5, stats);
}

export function rollPvpDamage(stats: CombatStats) {
  return rollCombatDamage(stats.power * randomRange(0.8, 0.6), stats);
}

export function rollEnemyDamage(power: number, min: number, spread: number) {
  return Math.floor(power * randomRange(min, spread));
}

export function generatePveEnemy(chapter: number, level: number, isBoss: boolean): PveEnemy {
  const basePower = 20 + chapter * 5 + level * 3;
  const power = isBoss ? basePower * 1.5 : basePower;
  const maxHP = power * 10;
  const names = isBoss ? PVE_BOSS_NAMES : PVE_MOB_NAMES;
  const portraits = isBoss ? PVE_BOSS_PORTRAITS : PVE_MOB_PORTRAITS;

  return {
    id: `pve-${chapter}-${level}-${isBoss ? 'boss' : 'mob'}`,
    name: `${randomItem(names)} (Гл. ${chapter}-${level})`,
    portrait: randomItem(portraits),
    power,
    maxHP,
    isBoss,
  };
}

export function shouldDropPveArtifact(isBoss: boolean) {
  return isBoss ? Math.random() > 0.7 : Math.random() > 0.9;
}

export function createBotPicks(heroPool: Array<SquadHero & { owned?: boolean }>): SquadHero[] {
  const picks: SquadHero[] = [];
  while (picks.length < 3) {
    const pick = randomItem(heroPool);
    if (!pick) break;
    picks.push({ ...pick, basePower: Math.floor(pick.basePower * randomRange(0.85, 0.35)) });
  }
  return picks;
}

export function rollCardActionDamage(power: number, ability: 'basic' | 'skill') {
  const base = ability === 'basic'
    ? power * randomRange(0.75, 0.35)
    : power * randomRange(1.8, 0.45);
  return Math.max(1, Math.floor(base));
}

export function rollBotAbility(skillReady: boolean) {
  return skillReady && Math.random() > 0.35 ? 'skill' : 'basic';
}
