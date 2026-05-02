export type SecurityAlert = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  involvedPlayers: string[];
  details: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
};

export function buildAlertId(seq: number): string {
  return `alert-${Math.max(1, Math.floor(seq))}`;
}

