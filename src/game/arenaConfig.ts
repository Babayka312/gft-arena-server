export type ArenaRankingPeriod = 'week' | 'month';

export type ArenaRankingReward = {
  place: string;
  reward: string;
  accent: string;
};

export type ArenaRankingEntry = {
  place: number;
  name: string;
  score: number;
  wins: number;
  playerId?: string;
};

export const ARENA_RANKING_REWARDS: Record<ArenaRankingPeriod, ArenaRankingReward[]> = {
  week: [
    { place: 'Участие за неделю', reward: '1-5 GFT (по активности сезона)', accent: '#22c55e' },
    { place: 'Серия побед', reward: 'Редкие/эпические осколки', accent: '#38bdf8' },
  ],
  month: [
    { place: 'Топ-1', reward: '50 GFT', accent: '#facc15' },
    { place: 'Топ-10', reward: '25 GFT', accent: '#c4b5fd' },
    { place: 'Топ-50', reward: '10 GFT', accent: '#38bdf8' },
    { place: 'Топ-100', reward: '5 GFT', accent: '#22c55e' },
  ],
};

const PVP_OPPONENT_EMOJIS = ['🥷', '🐂', '🦊', '🐉', '⚔️', '🛡️', '🎯', '🌟', '💀', '🛸', '🐺', '🦁'] as const;

export function pvpEmojiForPlayerId(playerId: string): string {
  const n = Number(playerId);
  const i = Number.isFinite(n) ? Math.abs(n) % PVP_OPPONENT_EMOJIS.length : 0;
  return PVP_OPPONENT_EMOJIS[i];
}
