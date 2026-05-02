import type { EconomyTransaction } from './transactionsMonitor';

export type SecurityAlert = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  involvedPlayers: string[];
  details: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
};

export type AnomalyCandidate = Omit<SecurityAlert, 'id' | 'createdAt' | 'resolvedAt'>;

export function detectWithdrawSpike(_rows: EconomyTransaction[]): AnomalyCandidate | null {
  return null;
}

export function detectMultiAccountSameDestination(_rows: EconomyTransaction[]): AnomalyCandidate | null {
  return null;
}

export function detectAccountHyperActivity(_rows: EconomyTransaction[]): AnomalyCandidate | null {
  return null;
}

export function detectEmissionBurst(_rows: EconomyTransaction[]): AnomalyCandidate | null {
  return null;
}

