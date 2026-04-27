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
