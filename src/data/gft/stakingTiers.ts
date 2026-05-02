export type StakingTier = {
  id: 'tier_500' | 'tier_2000' | 'tier_5000' | 'tier_10000';
  minStake: number;
  farmBonusPct: number;
  rareDropBonusPct: number;
  pvpBonusPct: number;
  exclusiveRewards: boolean;
};

export const STAKING_LOCK_DAYS = 30;

export const STAKING_TIERS: StakingTier[] = [
  { id: 'tier_500', minStake: 500, farmBonusPct: 5, rareDropBonusPct: 0, pvpBonusPct: 0, exclusiveRewards: false },
  { id: 'tier_2000', minStake: 2000, farmBonusPct: 10, rareDropBonusPct: 5, pvpBonusPct: 0, exclusiveRewards: false },
  { id: 'tier_5000', minStake: 5000, farmBonusPct: 20, rareDropBonusPct: 5, pvpBonusPct: 5, exclusiveRewards: false },
  { id: 'tier_10000', minStake: 10000, farmBonusPct: 30, rareDropBonusPct: 8, pvpBonusPct: 8, exclusiveRewards: true },
];
