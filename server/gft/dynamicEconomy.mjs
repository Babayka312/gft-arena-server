export const DYNAMIC_ECONOMY_DEFAULT = {
  lastPrice: 1,
  priceDeltaPct: 0,
  withdrawalVolumeDeltaPct: 0,
  rewardMultiplier: 1,
  emissionMultiplier: 1,
  withdrawalFeePct: 7,
  updatedAt: new Date().toISOString(),
};

export function monitorPrice(currentPrice, previousPrice) {
  if (!Number.isFinite(previousPrice) || previousPrice <= 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}

export function adjustRewards(priceDeltaPct) {
  if (priceDeltaPct >= 20) return 0.75;
  if (priceDeltaPct >= 10) return 0.9;
  if (priceDeltaPct <= -20) return 1.2;
  if (priceDeltaPct <= -10) return 1.1;
  return 1;
}

export function adjustWithdrawalFees(withdrawalVolumeDeltaPct) {
  if (withdrawalVolumeDeltaPct >= 25) return 10;
  if (withdrawalVolumeDeltaPct >= 10) return 8;
  if (withdrawalVolumeDeltaPct <= -25) return 5;
  if (withdrawalVolumeDeltaPct <= -10) return 6;
  return 7;
}

export function adjustEmission(withdrawalVolumeDeltaPct) {
  if (withdrawalVolumeDeltaPct >= 20) return 0.85;
  if (withdrawalVolumeDeltaPct >= 10) return 0.9;
  if (withdrawalVolumeDeltaPct <= -20) return 1.15;
  if (withdrawalVolumeDeltaPct <= -10) return 1.1;
  return 1;
}

export function buildDynamicEconomyState({
  currentPrice,
  previousPrice,
  withdrawalVolumeDeltaPct,
  now = Date.now(),
}) {
  const priceDeltaPct = monitorPrice(currentPrice, previousPrice);
  return {
    lastPrice: currentPrice,
    priceDeltaPct,
    withdrawalVolumeDeltaPct,
    rewardMultiplier: adjustRewards(priceDeltaPct),
    emissionMultiplier: adjustEmission(withdrawalVolumeDeltaPct),
    withdrawalFeePct: adjustWithdrawalFees(withdrawalVolumeDeltaPct),
    updatedAt: new Date(now).toISOString(),
  };
}
