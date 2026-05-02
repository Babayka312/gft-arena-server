import { STAKING_LOCK_DAYS, STAKING_TIERS, type StakingTier } from '../../data/gft/stakingTiers';

export function getStakingTier(amount: number): StakingTier | null {
  let current: StakingTier | null = null;
  for (const tier of STAKING_TIERS) {
    if (amount >= tier.minStake) current = tier;
  }
  return current;
}

export function calcStakeUnlockAt(startedAtMs: number): number {
  return startedAtMs + STAKING_LOCK_DAYS * 24 * 60 * 60 * 1000;
}
