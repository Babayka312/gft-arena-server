import type { CSSProperties } from 'react';
import {
  BATTLEPASS_PRICE_GFT,
  BATTLEPASS_QUESTS,
  BATTLEPASS_TIERS,
  BATTLEPASS_XP_PER_LEVEL,
  type BattlePassQuestKind,
  type BattlePassTier,
} from '../game/battlePassConfig';

const sectionTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  margin: '0 0 22px',
  fontSize: 'clamp(28px, 5vw, 42px)',
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: '0.055em',
  textTransform: 'uppercase',
  textShadow: `0 0 18px ${color}66, 0 4px 14px rgba(0,0,0,0.85)`,
});

const metaTextStyle: CSSProperties = {
  color: '#c4b5fd',
  fontSize: '14px',
  fontWeight: 750,
  letterSpacing: '0.025em',
  textShadow: '0 2px 10px rgba(0,0,0,0.85)',
};

const cardTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase',
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

const mutedTextStyle: CSSProperties = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

export type BattlePassScreenProps = {
  background: string;
  contentInset: CSSProperties;
  battlePassPremium: boolean;
  currentBattlePassLevel: number;
  currentBattlePassLevelXp: number;
  battlePassXp: number;
  battlePassQuestProgress: Record<BattlePassQuestKind, number>;
  isRewardClaimed: (tier: number, track: 'free' | 'paid') => boolean;
  onClaimReward: (tier: BattlePassTier, track: 'free' | 'paid') => void;
  onBuyPremium: () => void;
};

export function BattlePassScreen({
  background,
  contentInset,
  battlePassPremium,
  currentBattlePassLevel,
  currentBattlePassLevelXp,
  battlePassXp,
  battlePassQuestProgress,
  isRewardClaimed,
  onClaimReward,
  onBuyPremium,
}: BattlePassScreenProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url('${background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...contentInset,
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>🏆 БАТЛПАСС</h2>
      <div style={{ maxWidth: '680px', margin: '0 auto 18px', padding: '0 16px' }}>
        <p
          style={{
            ...metaTextStyle,
            color: '#e2e8f0',
            margin: 0,
            padding: '14px 16px',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            textAlign: 'left',
            background: 'rgba(15,23,42,0.94)',
            border: '1px solid rgba(148,163,184,0.35)',
            borderRadius: '18px',
            boxShadow: '0 14px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            textShadow: 'none',
          }}
        >
          Сначала задания «Вводный тур» и «Тренировочный PvE» привязаны к обучению; дальше — кампания, HOLD, PVP и наборы. Максимум <b style={{ color: '#a5b4fc' }}>50 уровней</b>. Бесплатная дорожка — фарм, премиум — кристаллы и наборы.
        </p>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto 18px', padding: '0 16px' }}>
        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(250,204,21,0.45)', borderRadius: '22px', padding: '16px', boxShadow: '0 18px 40px rgba(0,0,0,0.28)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', textAlign: 'left' }}>
            <div>
              <div style={cardTitleStyle('#facc15')}>Сезон “Зов арены”</div>
              <div style={{ ...mutedTextStyle, fontSize: '13px', marginTop: '4px' }}>
                Открыт уровень {currentBattlePassLevel} из {BATTLEPASS_TIERS.length} • {currentBattlePassLevelXp}/{BATTLEPASS_XP_PER_LEVEL} XP до следующего уровня
              </div>
            </div>
            <button
              type="button"
              onClick={onBuyPremium}
              disabled={battlePassPremium}
              style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', background: battlePassPremium ? '#166534' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 950, cursor: battlePassPremium ? 'default' : 'pointer', fontSize: 'clamp(11px, 3vw, 14px)', width: '100%', maxWidth: '320px' }}
            >
              {battlePassPremium ? 'Премиум открыт' : `Открыть премиум • ${BATTLEPASS_PRICE_GFT} GFT`}
            </button>
          </div>
          <div style={{ height: '10px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '14px' }}>
            <div
              style={{
                width: `${Math.min(100, (battlePassXp / ((BATTLEPASS_TIERS.length - 1) * BATTLEPASS_XP_PER_LEVEL)) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #eab308)',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto 18px', padding: '0 16px', textAlign: 'left' }}>
        <div style={{ ...cardTitleStyle('#e2e8f0'), marginBottom: '10px' }}>Задания сезона</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
          {BATTLEPASS_QUESTS.map(quest => {
            const isPremiumQuest = quest.track === 'paid';
            const progress = Math.min(battlePassQuestProgress[quest.id] ?? 0, quest.target);
            const done = progress >= quest.target;
            const premiumLocked = isPremiumQuest && !battlePassPremium && !done;
            return (
              <div
                key={quest.id}
                style={{
                  background: isPremiumQuest
                    ? 'linear-gradient(165deg, rgba(88,28,135,0.42), rgba(15,23,42,0.94) 48%, rgba(30,27,75,0.88))'
                    : 'rgba(15,23,42,0.88)',
                  border: `2px solid ${done ? '#22c55e' : isPremiumQuest ? 'rgba(232,121,249,0.85)' : quest.accent}`,
                  borderRadius: '18px',
                  padding: '14px',
                  boxShadow: isPremiumQuest
                    ? '0 0 22px rgba(192,132,252,0.22), 0 12px 28px rgba(0,0,0,0.28), inset 0 0 18px rgba(88,28,135,0.15)'
                    : '0 12px 28px rgba(0,0,0,0.22)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    {isPremiumQuest && (
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 950,
                          letterSpacing: '0.12em',
                          marginBottom: '6px',
                          background: 'linear-gradient(90deg, #fce7f3, #e879f9, #facc15)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          color: '#f0abfc',
                        }}
                      >
                        ПРЕМИУМ ТРЕК
                      </div>
                    )}
                    <div style={cardTitleStyle(done ? '#86efac' : isPremiumQuest ? '#f0abfc' : quest.accent)}>{quest.title}</div>
                    <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '4px' }}>{quest.description}</div>
                    {premiumLocked && (
                      <div style={{ fontSize: '11px', color: '#c4b5fd', marginTop: '8px', fontWeight: 800 }}>
                        Открой премиум Battle Pass, чтобы копить прогресс
                      </div>
                    )}
                  </div>
                  <div style={{ color: done ? '#22c55e' : isPremiumQuest ? '#f9a8d4' : '#facc15', fontWeight: 950, whiteSpace: 'nowrap' }}>
                    {premiumLocked ? '—' : `${progress}/${quest.target}`}
                  </div>
                </div>
                <div style={{ height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '12px' }}>
                  <div
                    style={{
                      width: premiumLocked ? '0%' : `${(progress / quest.target) * 100}%`,
                      height: '100%',
                      background: done ? '#22c55e' : isPremiumQuest ? 'linear-gradient(90deg, #c084fc, #facc15)' : quest.accent,
                    }}
                  />
                </div>
                <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '8px' }}>
                  {done ? 'Задание выполнено' : premiumLocked ? `+${quest.xpPerStep} BP XP за шаг после покупки премиума` : `+${quest.xpPerStep} BP XP за каждый прогресс`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px', display: 'grid', gap: '12px' }}>
        {BATTLEPASS_TIERS.map(tier => {
          const unlocked = tier.level <= currentBattlePassLevel;
          const freeClaimed = isRewardClaimed(tier.level, 'free');
          const paidClaimed = isRewardClaimed(tier.level, 'paid');
          return (
            <div key={tier.level} style={{ display: 'grid', gridTemplateColumns: 'minmax(48px, 56px) minmax(0, 1fr) minmax(0, 1fr)', gap: '8px', alignItems: 'stretch', width: '100%', minWidth: 0 }}>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: unlocked ? 'linear-gradient(160deg, #422006, #111827 72%)' : 'linear-gradient(160deg, #111827, #020617)',
                  border: `2px solid ${unlocked ? '#eab308' : '#475569'}`,
                  borderRadius: '18px',
                  color: unlocked ? '#facc15' : '#94a3b8',
                  fontWeight: 950,
                  fontSize: 'clamp(11px, 2.8vw, 14px)',
                  boxShadow: unlocked ? '0 0 24px rgba(234,179,8,0.24), inset 0 0 18px rgba(0,0,0,0.55)' : 'inset 0 0 18px rgba(0,0,0,0.65)',
                  padding: '4px',
                }}
              >
                Lv. {tier.level}
              </div>
              {(['free', 'paid'] as const).map(track => {
                const claimed = track === 'free' ? freeClaimed : paidClaimed;
                const lockedByPremium = track === 'paid' && !battlePassPremium;
                const reward = tier[track];
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => onClaimReward(tier, track)}
                    disabled={!unlocked || claimed || lockedByPremium}
                    style={{
                      padding: '10px 8px',
                      minHeight: '72px',
                      minWidth: 0,
                      background: claimed
                        ? 'linear-gradient(135deg, #064e3b, #0f172a 72%)'
                        : track === 'free'
                          ? 'linear-gradient(135deg, #0f172a, #111827 58%, #020617)'
                          : 'linear-gradient(135deg, #581c87, #1e3a8a 58%, #020617)',
                      border: `2px solid ${claimed ? '#22c55e' : track === 'free' ? '#60a5fa' : '#c084fc'}`,
                      borderRadius: '18px',
                      color: unlocked ? '#fff' : '#cbd5e1',
                      textAlign: 'left',
                      cursor: unlocked && !claimed && !lockedByPremium ? 'pointer' : 'default',
                      boxShadow: claimed
                        ? '0 0 24px rgba(34,197,94,0.22), inset 0 0 20px rgba(0,0,0,0.42)'
                        : '0 14px 30px rgba(2,6,23,0.58), inset 0 0 20px rgba(0,0,0,0.52)',
                      opacity: unlocked ? 1 : 0.72,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ ...cardTitleStyle(track === 'free' ? '#93c5fd' : '#f0abfc'), fontSize: 'clamp(11px, 2.8vw, 14px)' }}>{track === 'free' ? 'Бесплатно' : 'Премиум'}</div>
                    <div style={{ fontSize: 'clamp(11px, 2.9vw, 13px)', fontWeight: 900, marginTop: '6px', lineHeight: 1.25, wordBreak: 'break-word' }}>{reward.label}</div>
                    <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '6px' }}>
                      {claimed ? 'Забрано' : lockedByPremium ? 'Нужен премиум' : unlocked ? 'Нажми, чтобы забрать' : 'Откроется позже'}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
