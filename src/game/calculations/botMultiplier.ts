/**
 * Множители силы бот-отряда в карточных боях (клиент).
 * С сервером не синхронизировано — при необходимости валидации вынеси в `/server` + общий пакет.
 */
export const TRAINING_PVE_BOT_MULTIPLIER = 0.42;

export function getPvpBotMultiplierFromRatingDiff(playerRating: number, opponentRating: number): number {
  const diff = opponentRating - playerRating;
  return 1 + Math.max(-0.5, Math.min(0.5, diff * 0.0008));
}

export function getPveCampaignBotMultiplier(chapter: number, level: number, isBoss: boolean): number {
  return 1 + chapter * 0.08 + level * 0.05 + (isBoss ? 0.28 : 0);
}

export type CardBattleBotMultInput = {
  isTrainingPve: boolean;
  mode: 'pvp' | 'pve';
  playerRating: number;
  pveContext?: { chapter: number; level: number; isBoss: boolean } | null;
  pvpOpponentRating?: number | null;
};

export function resolveCardBattleBotMultiplier(input: CardBattleBotMultInput): number {
  const { isTrainingPve, mode, playerRating, pveContext, pvpOpponentRating } = input;
  if (isTrainingPve) return TRAINING_PVE_BOT_MULTIPLIER;
  if (mode === 'pve' && pveContext) {
    return getPveCampaignBotMultiplier(pveContext.chapter, pveContext.level, pveContext.isBoss);
  }
  if (mode === 'pvp' && pvpOpponentRating != null) {
    return getPvpBotMultiplierFromRatingDiff(playerRating, pvpOpponentRating);
  }
  return 1;
}
