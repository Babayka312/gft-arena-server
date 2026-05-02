export type EconomyTransactionType =
  | 'reward'
  | 'stake'
  | 'unstake'
  | 'withdraw'
  | 'spend'
  | 'admin_adjust';

export type EconomyTransaction = {
  id: string;
  playerId: string;
  type: EconomyTransactionType;
  amount: number;
  metadata: Record<string, unknown>;
  timestamp: string;
  source?: string | null;
  destination?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  riskScore?: number;
};

export type PlayerEconomy = {
  playerId: string;
  gftBalance: number;
  stakedGft: number;
  totalEarnedGft: number;
  totalWithdrawnGft: number;
};

export function createDefaultPlayerEconomy(playerId: string): PlayerEconomy {
  return {
    playerId,
    gftBalance: 0,
    stakedGft: 0,
    totalEarnedGft: 0,
    totalWithdrawnGft: 0,
  };
}

