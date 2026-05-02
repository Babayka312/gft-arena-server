export const ADMIN_SECURITY_ROUTES = {
  suspicious: '/api/admin/security/suspicious',
  alerts: '/api/admin/security/alerts',
  flagPlayer: '/api/admin/security/flag-player',
} as const;

export type FlagPlayerBody = {
  playerId: string;
  reason: string;
  action: 'warn' | 'limit_rewards' | 'block_withdraw' | 'ban';
};

