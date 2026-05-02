export const GFT_SEASON_REWARDS = {
  top100: 5,
  top50: 10,
  top10: 25,
  top1: 50,
} as const;

export const GFT_WEEKLY_ACTIVITY_REWARDS = {
  low: 1,
  medium: 2,
  high: 5,
} as const;

export const GFT_DAILY_FINAL_REWARD = 0.5;

export const GFT_REWARD_RULES = {
  season: GFT_SEASON_REWARDS,
  weeklyActivity: GFT_WEEKLY_ACTIVITY_REWARDS,
  dailyFinalOnly: GFT_DAILY_FINAL_REWARD,
  notes: 'GFT rewards are rare and tied to seasonal, weekly, and full daily completion only.',
} as const;
