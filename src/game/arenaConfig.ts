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
    { place: '1 место', reward: '300 кристаллов, 12000 монет, мифический набор', accent: '#facc15' },
    { place: '2-3 место', reward: '180 кристаллов, 8000 монет, элитный набор', accent: '#c4b5fd' },
    { place: '4-10 место', reward: '90 кристаллов, 4500 монет, 80 осколков', accent: '#38bdf8' },
    { place: '11-50 место', reward: '35 кристаллов, 2000 монет', accent: '#22c55e' },
  ],
  month: [
    { place: '1 место', reward: '1200 кристаллов, 50000 монет, 2 мифических набора', accent: '#facc15' },
    { place: '2-3 место', reward: '750 кристаллов, 32000 монет, мифический набор', accent: '#c4b5fd' },
    { place: '4-10 место', reward: '400 кристаллов, 18000 монет, элитный набор', accent: '#38bdf8' },
    { place: '11-100 место', reward: '120 кристаллов, 7000 монет, 150 осколков', accent: '#22c55e' },
  ],
};

const PVP_OPPONENT_EMOJIS = ['🥷', '🐂', '🦊', '🐉', '⚔️', '🛡️', '🎯', '🌟', '💀', '🛸', '🐺', '🦁'] as const;

export function pvpEmojiForPlayerId(playerId: string): string {
  const n = Number(playerId);
  const i = Number.isFinite(n) ? Math.abs(n) % PVP_OPPONENT_EMOJIS.length : 0;
  return PVP_OPPONENT_EMOJIS[i];
}
