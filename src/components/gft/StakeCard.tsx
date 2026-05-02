import { memo } from 'react';
import type { GftStakeEntry, GftStakeTier } from '../../xaman';

type StakeCardProps = {
  tiers: GftStakeTier[];
  currentTierId: string | null;
  stakes: GftStakeEntry[];
  stakeAmount: string;
  stakeBusy: boolean;
  unstakeBusy: boolean;
  onStakeAmountChange: (next: string) => void;
  onStake: () => void;
  onUnstake: (stakeId?: string) => void;
};

function formatTimeLeft(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
}

export const StakeCard = memo(function StakeCard({
  tiers,
  currentTierId,
  stakes,
  stakeAmount,
  stakeBusy,
  unstakeBusy,
  onStakeAmountChange,
  onStake,
  onUnstake,
}: StakeCardProps) {
  return (
    <section
      style={{
        borderRadius: '16px',
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(148,163,184,0.28)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        padding: '12px',
        display: 'grid',
        gap: '10px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
        Staking
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {tiers.map((tier) => {
          const active = tier.id === currentTierId;
          return (
            <div
              key={tier.id}
              style={{
                borderRadius: '12px',
                border: `1px solid ${active ? '#facc15' : 'rgba(71,85,105,0.65)'}`,
                background: active ? 'rgba(250,204,21,0.1)' : 'rgba(15,23,42,0.65)',
                padding: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: '13px' }}>От {tier.minStake.toLocaleString()} GFT</div>
                {active && <span style={{ fontSize: '10px', color: '#fde68a', fontWeight: 900 }}>ТЕКУЩИЙ</span>}
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.35 }}>
                +{tier.farmBonusPct}% farm{tier.rareDropBonusPct ? ` • +${tier.rareDropBonusPct}% rare` : ''}
                {tier.pvpBonusPct ? ` • +${tier.pvpBonusPct}% PvP` : ''}
                {tier.exclusiveRewards ? ' • эксклюзив' : ''}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={stakeAmount}
          onChange={(e) => onStakeAmountChange(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="Сумма GFT"
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: '12px',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#fff',
            padding: '10px 12px',
            fontSize: '15px',
            fontWeight: 700,
          }}
        />
        <button
          type="button"
          onClick={onStake}
          disabled={stakeBusy}
          style={{
            borderRadius: '12px',
            border: 'none',
            background: stakeBusy ? '#475569' : '#22c55e',
            color: '#052e16',
            fontWeight: 900,
            padding: '10px 14px',
            cursor: stakeBusy ? 'not-allowed' : 'pointer',
            minWidth: '96px',
          }}
        >
          {stakeBusy ? '...' : 'Stake'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '6px' }}>
        {stakes.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#64748b' }}>Активных стейков нет.</div>
        ) : (
          stakes.map((s) => (
            <div key={s.id} style={{ borderRadius: '10px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.6)', padding: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 800 }}>{Math.floor(s.amount).toLocaleString()} GFT</div>
                <div style={{ color: s.canUnstake ? '#86efac' : '#fcd34d', fontSize: '11px', fontWeight: 800 }}>
                  {s.canUnstake ? 'Разблокирован' : `Ещё ${formatTimeLeft(s.timeLeftMs ?? 0)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUnstake(s.id)}
                disabled={!s.canUnstake || unstakeBusy}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: s.canUnstake && !unstakeBusy ? 'rgba(56,189,248,0.24)' : 'rgba(51,65,85,0.7)',
                  color: s.canUnstake && !unstakeBusy ? '#bae6fd' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '12px',
                  padding: '8px 10px',
                  cursor: s.canUnstake && !unstakeBusy ? 'pointer' : 'not-allowed',
                }}
              >
                Unstake
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
});
