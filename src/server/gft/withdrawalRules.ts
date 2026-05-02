export const GFT_WITHDRAW_RULES = {
  minAmount: 50,
  maxAmount: 1000,
  feePctRange: { min: 5, max: 10 },
  cooldownDays: 7,
  minAccountAgeDays: 7,
  requirements: {
    kycVerified: true,
    minHeroLevel: 10,
    minTotalBattles: 100,
  },
} as const;

export type GftWithdrawValidationInput = {
  amount: number;
  heroLevel: number;
  totalBattles: number;
  accountAgeDays: number;
  kycVerified: boolean;
};

export function validateGftWithdraw(input: GftWithdrawValidationInput): string[] {
  const reasons: string[] = [];
  if (input.amount < GFT_WITHDRAW_RULES.minAmount) reasons.push('amount_below_min');
  if (input.heroLevel < GFT_WITHDRAW_RULES.requirements.minHeroLevel) reasons.push('hero_level_too_low');
  if (input.totalBattles < GFT_WITHDRAW_RULES.requirements.minTotalBattles) reasons.push('insufficient_battles');
  if (input.accountAgeDays < GFT_WITHDRAW_RULES.minAccountAgeDays) reasons.push('account_too_new');
  if (!input.kycVerified) reasons.push('kyc_required');
  return reasons;
}
