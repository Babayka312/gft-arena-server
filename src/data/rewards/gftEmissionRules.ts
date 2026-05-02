export type GftEmissionSource =
  | 'seasonal_ranking'
  | 'top_rating'
  | 'weekly_activity'
  | 'rare_events'
  | 'staking';

export type GftEmissionRules = {
  weeklyCap: number;
  monthlyCap: number;
  perSourceWeeklyCaps: Record<GftEmissionSource, number>;
  allowedSources: GftEmissionSource[];
  disallowedSources: string[];
};

export const GFT_EMISSION_RULES: GftEmissionRules = {
  weeklyCap: 2500,
  monthlyCap: 10000,
  perSourceWeeklyCaps: {
    seasonal_ranking: 900,
    top_rating: 500,
    weekly_activity: 450,
    rare_events: 250,
    staking: 400,
  },
  allowedSources: [
    'seasonal_ranking',
    'top_rating',
    'weekly_activity',
    'rare_events',
    'staking',
  ],
  disallowedSources: [
    'pve_rewards',
    'regular_pvp_wins',
    'partial_daily_quests',
    'micro_activities',
  ],
};
