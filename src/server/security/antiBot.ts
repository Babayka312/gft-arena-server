export type SecurityStatus = 'normal' | 'suspicious' | 'limited' | 'blocked';

export type SecurityProfile = {
  playerId: string;
  riskScore: number; // 0..100
  flags: Array<{ at: string; reason: string; action: 'warn' | 'limit_rewards' | 'block_withdraw' | 'ban' }>;
  lastActivity: string;
  status: SecurityStatus;
};

export type AntiBotEventType =
  | 'game_login'
  | 'api_request'
  | 'battle_reward'
  | 'pvp_enter'
  | 'stake'
  | 'unstake'
  | 'withdraw_request'
  | 'spend';

export type AntiBotEvent = {
  playerId: string;
  eventType: AntiBotEventType;
  at: number;
  metadata?: Record<string, unknown>;
};

export function createEmptySecurityProfile(playerId: string): SecurityProfile {
  return {
    playerId,
    riskScore: 0,
    flags: [],
    lastActivity: new Date().toISOString(),
    status: 'normal',
  };
}

export function calcSecurityStatus(score: number): SecurityStatus {
  if (score > 90) return 'blocked';
  if (score > 80) return 'limited';
  if (score > 60) return 'suspicious';
  return 'normal';
}

export function applyRiskDelta(currentScore: number, delta: number): number {
  return Math.max(0, Math.min(100, Number((currentScore + delta).toFixed(2))));
}

/** Shared pure helper for risk thresholds. Runtime persistence lives in server/security/antiBot.mjs */
export const ANTI_BOT_THRESHOLDS = {
  suspicious: 60,
  limitRewards: 80,
  blockWithdraw: 90,
} as const;

