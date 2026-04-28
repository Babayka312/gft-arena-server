import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { ReferralSnapshot } from '../playerProgress';

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

export type ReferralsScreenProps = {
  background: string;
  contentInset: CSSProperties;
  bottomInsetPx: number;
  referralData: ReferralSnapshot | null;
  playerId: string | null;
  referralCodeInput: string;
  setReferralCodeInput: Dispatch<SetStateAction<string>>;
  referralBusy: boolean;
  onBindReferralCode: () => void;
  onClaimTierReward: (invites: number) => void;
};

export function ReferralsScreen({
  background,
  contentInset,
  bottomInsetPx,
  referralData,
  playerId,
  referralCodeInput,
  setReferralCodeInput,
  referralBusy,
  onBindReferralCode,
  onClaimTierReward,
}: ReferralsScreenProps) {
  return (
    <div style={{
      minHeight: '100dvh',
      backgroundImage: `url('${background}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'scroll',
      ...contentInset,
      paddingBottom: `${bottomInsetPx}px`,
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 12px 20px' }}>
        <h2 style={sectionTitleStyle('#22d3ee')}>Рефералы</h2>
        <div style={{ ...metaTextStyle, marginBottom: '12px', fontSize: 'clamp(12px, 3.2vw, 14px)', lineHeight: 1.45 }}>
          Приглашай друзей по своему ID игрока и получай награды за пороги приглашений.
        </div>

        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #155e75', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#67e8f9', fontSize: '12px', marginBottom: '3px' }}>Твой реферальный код</div>
              <div style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 900, letterSpacing: '0.03em' }}>
                {(referralData?.code ?? playerId) || '—'}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const code = referralData?.code ?? playerId;
                if (!code) return;
                try {
                  await navigator.clipboard.writeText(code);
                  alert('Код скопирован.');
                } catch {
                  alert(`Скопируй вручную: ${code}`);
                }
              }}
              style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', background: '#06b6d4', color: '#042f2e', fontWeight: 900, cursor: 'pointer' }}
            >
              Копировать код
            </button>
          </div>
          <div style={{ marginTop: '10px', color: '#94a3b8', fontSize: '12px' }}>
            Приглашено: <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{referralData?.invitedCount ?? 0}</span>
          </div>
          {referralData?.invitedBy && (
            <div style={{ marginTop: '6px', color: '#94a3b8', fontSize: '12px' }}>
              Ты приглашён игроком: <span style={{ color: '#a5f3fc', fontWeight: 800 }}>#{referralData.invitedBy}</span>
            </div>
          )}
        </div>

        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #334155', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ ...cardTitleStyle('#a5f3fc'), marginBottom: '8px' }}>Привязать реферальный код</div>
          <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
            Код привязывается один раз после создания героя.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={referralCodeInput}
              onChange={(e) => setReferralCodeInput(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="ID пригласившего игрока"
              style={{ flex: '1 1 240px', minWidth: '220px', height: '40px', borderRadius: '10px', border: '1px solid #334155', background: '#0b1220', color: '#fff', padding: '0 12px', fontSize: '14px', boxSizing: 'border-box' }}
              disabled={referralBusy || Boolean(referralData?.invitedBy)}
            />
            <button
              type="button"
              onClick={onBindReferralCode}
              disabled={referralBusy || Boolean(referralData?.invitedBy)}
              style={{ height: '40px', padding: '0 14px', borderRadius: '10px', border: 'none', background: referralBusy || referralData?.invitedBy ? '#334155' : '#06b6d4', color: referralBusy || referralData?.invitedBy ? '#94a3b8' : '#042f2e', fontWeight: 900, cursor: referralBusy || referralData?.invitedBy ? 'not-allowed' : 'pointer' }}
            >
              {referralData?.invitedBy ? 'Код уже привязан' : referralBusy ? '...' : 'Привязать'}
            </button>
          </div>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #334155', borderRadius: '16px', padding: '14px' }}>
          <div style={{ ...cardTitleStyle('#67e8f9'), marginBottom: '10px' }}>Награды пригласившему</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {(referralData?.tiers ?? []).map((tier) => {
              const canClaim = tier.available && !tier.claimed && !referralBusy;
              return (
                <div key={tier.invites} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: '#0b1220', border: `1px solid ${tier.claimed ? '#14532d' : tier.available ? '#155e75' : '#334155'}`, borderRadius: '12px', padding: '10px' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '13px' }}>{tier.invites} приглашений</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      +{tier.reward.coins ?? 0} монет, +{tier.reward.crystals ?? 0} кристаллов{tier.reward.gft ? `, +${tier.reward.gft} GFT` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClaimTierReward(tier.invites)}
                    disabled={!canClaim}
                    style={{ padding: '8px 10px', borderRadius: '10px', border: 'none', background: tier.claimed ? '#14532d' : canClaim ? '#22c55e' : '#334155', color: tier.claimed ? '#86efac' : canClaim ? '#052e16' : '#94a3b8', fontWeight: 900, cursor: canClaim ? 'pointer' : 'not-allowed' }}
                  >
                    {tier.claimed ? 'Получено' : tier.available ? 'Забрать' : 'Недоступно'}
                  </button>
                </div>
              );
            })}
            {!referralData && (
              <div style={{ ...mutedTextStyle, fontSize: '12px' }}>Загружаем данные рефералов…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

