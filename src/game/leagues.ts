export type RatingLeague = {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  name: string;
  emoji: string;
  /** Inclusive lower bound. */
  minRating: number;
  /** Tailwind-ish hex token used for borders/text. */
  color: string;
};

export const RATING_LEAGUES: RatingLeague[] = [
  { id: 'bronze',   name: 'Бронза',    emoji: '🥉', minRating: 0,    color: '#a16207' },
  { id: 'silver',   name: 'Серебро',   emoji: '🥈', minRating: 1100, color: '#94a3b8' },
  { id: 'gold',     name: 'Золото',    emoji: '🥇', minRating: 1300, color: '#facc15' },
  { id: 'platinum', name: 'Платина',   emoji: '💠', minRating: 1600, color: '#22d3ee' },
  { id: 'diamond',  name: 'Алмаз',     emoji: '💎', minRating: 1900, color: '#60a5fa' },
  { id: 'master',   name: 'Мастер',    emoji: '👑', minRating: 2200, color: '#a855f7' },
];

export function getRatingLeague(rating: number): RatingLeague {
  const r = Math.max(0, Number(rating) || 0);
  let current = RATING_LEAGUES[0]!;
  for (const league of RATING_LEAGUES) {
    if (r >= league.minRating) current = league;
  }
  return current;
}

export function getNextLeague(rating: number): RatingLeague | null {
  const current = getRatingLeague(rating);
  const idx = RATING_LEAGUES.findIndex((l) => l.id === current.id);
  if (idx < 0 || idx >= RATING_LEAGUES.length - 1) return null;
  return RATING_LEAGUES[idx + 1]!;
}

export function getLeagueProgressPct(rating: number): number {
  const r = Math.max(0, Number(rating) || 0);
  const current = getRatingLeague(r);
  const next = getNextLeague(r);
  if (!next) return 100;
  const span = next.minRating - current.minRating;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((r - current.minRating) / span) * 100)));
}
