export const STAKING_LOCK_DAYS = 30;
export const STAKING_LOCK_MS = STAKING_LOCK_DAYS * 24 * 60 * 60 * 1000;

export const STAKING_TIERS = [
  { id: 'tier_500', minStake: 500, farmBonusPct: 5, rareDropBonusPct: 0, pvpBonusPct: 0, exclusiveRewards: false },
  { id: 'tier_2000', minStake: 2000, farmBonusPct: 10, rareDropBonusPct: 5, pvpBonusPct: 0, exclusiveRewards: false },
  { id: 'tier_5000', minStake: 5000, farmBonusPct: 20, rareDropBonusPct: 5, pvpBonusPct: 5, exclusiveRewards: false },
  { id: 'tier_10000', minStake: 10000, farmBonusPct: 30, rareDropBonusPct: 8, pvpBonusPct: 8, exclusiveRewards: true },
];

export function getStakingTierByAmount(amount) {
  let current = null;
  for (const tier of STAKING_TIERS) {
    if (amount >= tier.minStake) current = tier;
  }
  return current;
}

export function getActiveStakeBonus(stakingState, now = Date.now()) {
  if (!stakingState || !Array.isArray(stakingState.stakes)) {
    return { farmBonusPct: 0, rareDropBonusPct: 0, pvpBonusPct: 0, exclusiveRewards: false };
  }
  const active = stakingState.stakes
    .filter((s) => Number(s.unlockAt) > now && Number(s.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  if (!active) return { farmBonusPct: 0, rareDropBonusPct: 0, pvpBonusPct: 0, exclusiveRewards: false };
  const tier = getStakingTierByAmount(Number(active.amount));
  if (!tier) return { farmBonusPct: 0, rareDropBonusPct: 0, pvpBonusPct: 0, exclusiveRewards: false };
  return {
    farmBonusPct: tier.farmBonusPct,
    rareDropBonusPct: tier.rareDropBonusPct,
    pvpBonusPct: tier.pvpBonusPct,
    exclusiveRewards: tier.exclusiveRewards,
  };
}
