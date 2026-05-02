import type { CSSProperties } from 'react';
import type { NftBonuses } from '../xrplClient';
import { Icon3D } from '../ui/Icon3D';
import { Background } from '../components/ui/Background';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';

const mutedTextStyle: CSSProperties = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

export type FarmScreenProps = {
  background: string;
  contentInset: CSSProperties;
  /** Базовая ставка (до NFT), как на сервере / в App */
  holdBaseRewardRate: number;
  balance: number;
  nftBonuses: NftBonuses;
  holdEndTime: number | null;
  now: number;
  holdAmountInput: string;
  setHoldAmountInput: (v: string) => void;
  holdBusy: boolean;
  onStartHold: () => void;
  holdLockedGft: number;
  holdEarnings: number;
  holdRewardRate: number;
};

export function FarmScreen({
  background,
  contentInset,
  holdBaseRewardRate,
  balance,
  nftBonuses,
  holdEndTime,
  now,
  holdAmountInput,
  setHoldAmountInput,
  holdBusy,
  onStartHold,
  holdLockedGft,
  holdEarnings,
  holdRewardRate,
}: FarmScreenProps) {
  const expectedReward = Math.max(0, Number(holdAmountInput) || 0) * holdBaseRewardRate * (1 + nftBonuses.holdRewardBonus);
  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(10,15,42,0.54) 0%, rgba(10,15,42,0.42) 100%)"
      style={{
        ...contentInset,
        textAlign: 'center',
        boxSizing: 'border-box',
        paddingLeft: '12px',
        paddingRight: '12px',
      }}
    >
      <div style={{ margin: '0 auto', maxWidth: '420px', width: '100%', display: 'grid', gap: '12px' }}>
        <GlassCard style={{ marginTop: '10px' }}>
          <SectionTitle title="HOLD GFT" subtitle="Cosmic-Arcane доход каждые 6 часов" />
        <p style={{ ...mutedTextStyle, margin: '0 0 8px' }}>Ставка за 6 часов</p>
        <p
          style={{
            fontSize: 'clamp(28px, 9vw, 42px)',
            fontWeight: 950,
            color: '#22c55e',
            margin: 0,
            textShadow: '0 0 18px rgba(34,197,94,0.75), 0 4px 12px rgba(0,0,0,0.8)',
          }}
        >
          +{(holdBaseRewardRate * (1 + nftBonuses.holdRewardBonus) * 100).toFixed(2)}%
        </p>
        <p style={{ ...mutedTextStyle, margin: '10px 0 0', fontSize: '12px' }}>
          Доступно: <b style={{ color: '#facc15' }}>{balance.toFixed(2)} GFT</b>
        </p>
        <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
          {nftBonuses.collections.map(collection => (
            <div
              key={collection.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '12px',
                background: collection.owned ? 'rgba(34,197,94,0.14)' : 'rgba(15,23,42,0.78)',
                border: `1px solid ${collection.owned ? '#22c55e' : '#334155'}`,
                color: collection.owned ? '#bbf7d0' : '#94a3b8',
                fontSize: 'clamp(10px, 2.8vw, 12px)',
                fontWeight: 900,
                textAlign: 'left',
              }}
            >
              <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{collection.name}</span>
              <span style={{ flexShrink: 0, textAlign: 'right' }}>
                {collection.owned
                  ? `x${collection.count} • +${Math.round(collection.holdRewardBonus * 100)}%`
                  : collection.available
                    ? 'нет NFT'
                    : 'скоро'}
              </span>
            </div>
          ))}
        </div>
        <p style={{ ...mutedTextStyle, margin: '12px 0 0', fontSize: '11px' }}>
          Игровые награды PVP/PVE: +{Math.round(nftBonuses.gameRewardBonus * 100)}%
        </p>
        </GlassCard>
      {!holdEndTime ? (
        <GlassCard style={{ display: 'grid', gap: '14px' }}>
          <input
            type="number"
            min="1"
            max={balance}
            value={holdAmountInput}
            onChange={event => setHoldAmountInput(event.target.value)}
            placeholder="Сумма GFT"
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid #f59e0b',
              background: '#0f172a',
              color: '#fff',
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: 900,
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ ...mutedTextStyle, fontSize: 'clamp(12px, 3.2vw, 13px)', wordBreak: 'break-word' }}>
            Ожидаемый доход:{' '}
            <b style={{ color: '#22c55e' }}>
              +{expectedReward.toFixed(2)} GFT
            </b>
          </div>
          <Button
            disabled={holdBusy}
            onClick={onStartHold}
            style={{
              padding: '14px 18px',
              borderRadius: '9999px',
              fontSize: 'clamp(14px, 3.8vw, 20px)',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: holdBusy ? 0.75 : 1,
              width: '100%',
              flexWrap: 'wrap',
              textAlign: 'center',
            }}
          >
            <Icon3D id="farm-3d" size={36} /> {holdBusy ? 'Проверяем сервер...' : 'Заморозить GFT на 6 ч.'}
          </Button>
        </GlassCard>
      ) : (
        <GlassCard style={{ marginTop: '8px', border: '1px solid rgba(250,204,21,0.5)' }}>
          <div style={{ ...mutedTextStyle, marginBottom: '8px' }}>
            Заморожено: <b style={{ color: '#facc15' }}>{holdLockedGft.toFixed(2)} GFT</b>
          </div>
          <div style={{ fontSize: '56px', fontWeight: '900' }}>
            {Math.max(0, Math.floor((holdEndTime - now) / 60000))}:
            {String(Math.max(0, Math.floor(((holdEndTime - now) % 60000) / 1000))).padStart(2, '0')}
          </div>
          <div style={{ color: '#22c55e', fontSize: '26px' }}>+{holdEarnings.toFixed(2)} GFT</div>
          <div style={{ ...mutedTextStyle, marginTop: '8px', fontSize: '12px' }}>Ставка зафиксирована сервером: +{(holdRewardRate * 100).toFixed(2)}%</div>
          <div style={{ ...mutedTextStyle, marginTop: '8px', fontSize: '12px' }}>После окончания вернётся депозит + начисленный процент.</div>
        </GlassCard>
      )}
      </div>
    </Background>
  );
}
