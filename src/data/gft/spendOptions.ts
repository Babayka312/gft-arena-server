export const GFT_SPEND_OPTIONS = {
  monsterUpgrade: {
    levelPlus1: { gft: 1 },
    levelPlus10: { gft: 8 },
  },
  artifactUpgrade: {
    rareToEpic: { gft: 3 },
    epicToLegendary: { gft: 10 },
  },
  pvpTournament: {
    entryFee: { gft: 1 },
    prizeFromPool: true,
  },
  premiumPacks: {
    currency: 'GFT_ONLY',
  },
  seasonPass: {
    currency: 'GFT_ONLY',
  },
  autoFarm: {
    oneHour: { gft: 1 },
  },
} as const;

export type GftSpendCategory = keyof typeof GFT_SPEND_OPTIONS;
