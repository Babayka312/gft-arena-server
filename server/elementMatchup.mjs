const STRONG_BONUS = 1.25;
const WEAK_BONUS = 0.85;

const ADVANTAGES = {
  fire: 'nature',
  water: 'fire',
  earth: 'water',
  air: 'earth',
  light: 'shadow',
  shadow: 'arcane',
  nature: 'air',
  arcane: 'light',
};

export function getElementMatchupSign(attacker, defender) {
  if (ADVANTAGES[attacker] === defender) return 'strong';
  if (ADVANTAGES[defender] === attacker) return 'weak';
  return 'neutral';
}

export function getElementMatchupMultiplier(attacker, defender) {
  const sign = getElementMatchupSign(attacker, defender);
  if (sign === 'strong') return STRONG_BONUS;
  if (sign === 'weak') return WEAK_BONUS;
  return 1;
}
