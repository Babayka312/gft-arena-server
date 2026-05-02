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
};

export function getWithdrawCooldownMs() {
  return GFT_WITHDRAW_RULES.cooldownDays * 24 * 60 * 60 * 1000;
}

export function validateWithdrawalEligibility({
  amount,
  heroLevel,
  totalBattles,
  accountAgeDays,
  kycVerified,
}) {
  const reasons = [];
  if (!Number.isFinite(amount) || amount <= 0) reasons.push('invalid_amount');
  if (amount < GFT_WITHDRAW_RULES.minAmount) reasons.push('amount_below_min');
  if (amount > GFT_WITHDRAW_RULES.maxAmount) reasons.push('amount_above_max');
  if (!kycVerified) reasons.push('kyc_required');
  if (heroLevel < GFT_WITHDRAW_RULES.requirements.minHeroLevel) reasons.push('hero_level_too_low');
  if (totalBattles < GFT_WITHDRAW_RULES.requirements.minTotalBattles) reasons.push('insufficient_battles');
  if (accountAgeDays < GFT_WITHDRAW_RULES.minAccountAgeDays) reasons.push('account_too_new');
  return reasons;
}
