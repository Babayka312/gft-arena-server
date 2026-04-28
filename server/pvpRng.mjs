// src/game/pvpRng.ts
function seedStringToState(seed) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return h >>> 0;
}
function createPvpRng(seed) {
  let state = seedStringToState(seed);
  const next = () => {
    state |= 0;
    state = state + 1831565813 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    randomRange(min, spread) {
      return min + next() * spread;
    },
    randomItem(items) {
      if (items.length === 0) throw new Error("randomItem: empty");
      return items[Math.floor(next() * items.length)];
    },
    rollBotAbility(skillReady) {
      return skillReady && next() > 0.35 ? "skill" : "basic";
    },
    rollCrit(chance) {
      return next() < chance;
    }
  };
}
function createBattleCardUid(side, idx, cardId) {
  const safe = String(cardId).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `pvp_${side}_${idx}_${safe}`;
}
export {
  createBattleCardUid,
  createPvpRng
};
