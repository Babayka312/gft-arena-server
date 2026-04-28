/** Детерминированный RNG для PvP: клиент и сервер должны давать одинаковую последовательность при том же seed. */

function seedStringToState(seed: string): number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export type PvpRngApi = {
  next: () => number;
  randomRange: (min: number, spread: number) => number;
  randomItem: <T>(items: T[]) => T;
  rollBotAbility: (skillReady: boolean) => 'basic' | 'skill';
  rollCrit: (chance: number) => boolean;
};

export function createPvpRng(seed: string): PvpRngApi {
  let state = seedStringToState(seed);
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    randomRange(min: number, spread: number) {
      return min + next() * spread;
    },
    randomItem<T>(items: T[]) {
      if (items.length === 0) throw new Error('randomItem: empty');
      return items[Math.floor(next() * items.length)]!;
    },
    rollBotAbility(skillReady: boolean) {
      return skillReady && next() > 0.35 ? 'skill' : 'basic';
    },
    rollCrit(chance: number) {
      return next() < chance;
    },
  };
}

export function createBattleCardUid(side: 'player' | 'bot', idx: number, cardId: string) {
  const safe = String(cardId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `pvp_${side}_${idx}_${safe}`;
}
