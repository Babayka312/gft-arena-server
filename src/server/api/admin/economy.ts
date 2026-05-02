export const ADMIN_ECONOMY_ROUTES = {
  overview: '/api/admin/economy/overview',
  transactions: '/api/admin/economy/transactions',
  player: '/api/admin/economy/player/:playerId',
  adjustLimits: '/api/admin/economy/adjust-limits',
} as const;

export type AdjustLimitsBody = {
  maxDailyEmission?: number;
  maxWeeklyEmission?: number;
  maxWithdrawPerDay?: number;
  minWithdrawAmount?: number;
  withdrawFee?: number;
};

