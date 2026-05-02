export type EconomyInput = {
  gftPriceDeltaPct: number;
  withdrawalVolumeDeltaPct: number;
};

export type EconomyAdjustments = {
  rewardMultiplier: number;
  withdrawalFeePct: number;
  emissionMultiplier: number;
};

export function monitorPrice(current: number, previous: number): number {
  if (!previous || !Number.isFinite(previous)) return 0;
  return ((current - previous) / previous) * 100;
}

export function adjustRewards(priceDeltaPct: number): number {
  if (priceDeltaPct >= 20) return 0.75;
  if (priceDeltaPct >= 10) return 0.9;
  if (priceDeltaPct <= -20) return 1.2;
  if (priceDeltaPct <= -10) return 1.1;
  return 1;
}

export function adjustWithdrawalFees(withdrawalVolumeDeltaPct: number): number {
  if (withdrawalVolumeDeltaPct >= 25) return 10;
  if (withdrawalVolumeDeltaPct >= 10) return 8;
  if (withdrawalVolumeDeltaPct <= -25) return 5;
  if (withdrawalVolumeDeltaPct <= -10) return 6;
  return 7;
}

export function adjustEmission(input: EconomyInput): EconomyAdjustments {
  const rewardMultiplier = adjustRewards(input.gftPriceDeltaPct);
  const withdrawalFeePct = adjustWithdrawalFees(input.withdrawalVolumeDeltaPct);
  const emissionMultiplier = input.withdrawalVolumeDeltaPct >= 10 ? 0.9 : input.withdrawalVolumeDeltaPct <= -10 ? 1.1 : 1;
  return { rewardMultiplier, withdrawalFeePct, emissionMultiplier };
}
