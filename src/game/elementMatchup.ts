import type { CardElement } from '../cards/catalog';

export type ElementMatchupSign = 'strong' | 'weak' | 'neutral';

const STRONG_BONUS = 1.25;
const WEAK_BONUS = 0.85;

const ADVANTAGES: Record<CardElement, CardElement> = {
  fire: 'nature',
  water: 'fire',
  earth: 'water',
  air: 'earth',
  light: 'shadow',
  shadow: 'arcane',
  nature: 'air',
  arcane: 'light',
};

export function getElementMatchupSign(
  attacker: CardElement,
  defender: CardElement,
): ElementMatchupSign {
  if (ADVANTAGES[attacker] === defender) return 'strong';
  if (ADVANTAGES[defender] === attacker) return 'weak';
  return 'neutral';
}

export function getElementMatchupMultiplier(
  attacker: CardElement,
  defender: CardElement,
): number {
  const sign = getElementMatchupSign(attacker, defender);
  if (sign === 'strong') return STRONG_BONUS;
  if (sign === 'weak') return WEAK_BONUS;
  return 1;
}

export function describeElementMatchup(sign: ElementMatchupSign): string {
  if (sign === 'strong') return 'преимущество стихии';
  if (sign === 'weak') return 'невыгодная стихия';
  return '';
}
