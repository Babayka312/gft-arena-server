/** Порядок как у `allHeroes` id 1…12 — для fallback, если в прогрессе нет строки `zodiac`. */
export const ZODIAC_ORDER_RU = [
  'Овен',
  'Телец',
  'Близнецы',
  'Рак',
  'Лев',
  'Дева',
  'Весы',
  'Скорпион',
  'Стрелец',
  'Козерог',
  'Водолей',
  'Рыбы',
] as const;

/** Русские названия знаков из `allHeroes` → файл в `public/images/avatars/`. */
const ZODIAC_TO_SLUG: Record<string, string> = {
  Овен: 'aries',
  Телец: 'taurus',
  Близнецы: 'gemini',
  Рак: 'cancer',
  Лев: 'leo',
  Дева: 'virgo',
  Весы: 'libra',
  Скорпион: 'scorpio',
  Стрелец: 'sagittarius',
  Козерог: 'capricorn',
  Водолей: 'aquarius',
  Рыбы: 'pisces',
};

export function getZodiacAvatarUrl(zodiac: string): string {
  const slug = ZODIAC_TO_SLUG[zodiac] ?? 'aries';
  return `/images/avatars/zodiac-${slug}.png`;
}

/** Стабильный знак по id игрока, если нет данных о герое (как на сервере pvp-opponents). */
export function zodiacFromPlayerId(playerId: string): string {
  let h = 0;
  for (let i = 0; i < playerId.length; i++) {
    h = (h * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  return ZODIAC_ORDER_RU[h % 12];
}

/**
 * Аватар соперника PvP: знак из API, иначе id главного героя 1–12, иначе hash по playerId.
 */
export function getPvpOpponentAvatarUrl(opp: {
  zodiac?: string;
  playerId: string;
  mainHeroId?: number;
}): string {
  const z = typeof opp.zodiac === 'string' ? opp.zodiac.trim() : '';
  if (z) return getZodiacAvatarUrl(z);
  const hid = opp.mainHeroId;
  if (typeof hid === 'number' && Number.isFinite(hid) && hid >= 1 && hid <= 12) {
    return getZodiacAvatarUrl(ZODIAC_ORDER_RU[hid - 1]);
  }
  return getZodiacAvatarUrl(zodiacFromPlayerId(opp.playerId));
}
