import { memo } from 'react';

type BalanceCardProps = {
  balance: number;
  availableToWithdraw: number;
  stakedAmount: number;
};

export const BalanceCard = memo(function BalanceCard({
  balance,
  availableToWithdraw,
  stakedAmount,
}: BalanceCardProps) {
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
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
        GFT Balance
      </div>
      <div style={{ fontSize: 'clamp(22px, 5vw, 30px)', color: '#facc15', fontWeight: 900, lineHeight: 1 }}>
        {Math.floor(balance).toLocaleString()} GFT
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
        <div style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '12px', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Доступно к выводу</div>
          <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: 900 }}>{Math.max(0, Math.floor(availableToWithdraw)).toLocaleString()}</div>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '12px', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Застейкано</div>
          <div style={{ fontSize: '16px', color: '#60a5fa', fontWeight: 900 }}>{Math.max(0, Math.floor(stakedAmount)).toLocaleString()}</div>
        </div>
      </div>
    </section>
  );
});
