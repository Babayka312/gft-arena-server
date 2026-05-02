import { memo } from 'react';

type WithdrawCardProps = {
  amount: string;
  feePct: number;
  minAmount: number;
  nextAvailableAt: string | null;
  destination: string;
  withdrawBusy: boolean;
  errorText: string;
  onAmountChange: (next: string) => void;
  onDestinationChange: (next: string) => void;
  onWithdraw: () => void;
};

export const WithdrawCard = memo(function WithdrawCard({
  amount,
  feePct,
  minAmount,
  nextAvailableAt,
  destination,
  withdrawBusy,
  errorText,
  onAmountChange,
  onDestinationChange,
  onWithdraw,
}: WithdrawCardProps) {
  const numeric = Number(amount) || 0;
  const feeAmount = numeric > 0 ? (numeric * feePct) / 100 : 0;
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
        Withdraw
      </div>
      <label style={{ display: 'grid', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Сумма вывода (GFT)</span>
        <input
          value={amount}
          onChange={(e) => onAmountChange(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          placeholder="50"
          style={{
            borderRadius: '12px',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#fff',
            padding: '10px 12px',
            fontSize: '15px',
            fontWeight: 700,
          }}
        />
      </label>

      <label style={{ display: 'grid', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>XRPL адрес получателя</span>
        <input
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value.trim())}
          placeholder="rXxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          style={{
            borderRadius: '12px',
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#fff',
            padding: '10px 12px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        />
      </label>

      <div style={{ borderRadius: '12px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(71,85,105,0.65)', padding: '8px', display: 'grid', gap: '4px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span>Минимальный вывод</span>
          <strong style={{ color: '#e2e8f0' }}>{minAmount} GFT</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span>Комиссия</span>
          <strong style={{ color: '#f59e0b' }}>{feePct.toFixed(1)}%</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span>Комиссия в GFT</span>
          <strong style={{ color: '#f59e0b' }}>{feeAmount.toFixed(2)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span>Следующий доступный вывод</span>
          <strong style={{ color: '#cbd5e1', fontSize: '11px' }}>
            {nextAvailableAt ? new Date(nextAvailableAt).toLocaleString() : 'Сейчас'}
          </strong>
        </div>
      </div>

      {errorText && (
        <div style={{ borderRadius: '10px', border: '1px solid rgba(239,68,68,0.55)', background: 'rgba(127,29,29,0.25)', color: '#fecaca', fontSize: '12px', fontWeight: 700, padding: '8px' }}>
          {errorText}
        </div>
      )}

      <button
        type="button"
        onClick={onWithdraw}
        disabled={withdrawBusy}
        style={{
          minHeight: '44px',
          borderRadius: '12px',
          border: 'none',
          background: withdrawBusy ? '#475569' : 'linear-gradient(180deg, #4ade80, #22c55e)',
          color: '#052e16',
          fontWeight: 900,
          fontSize: '14px',
          cursor: withdrawBusy ? 'not-allowed' : 'pointer',
        }}
      >
        {withdrawBusy ? 'Отправка...' : 'Withdraw'}
      </button>
    </section>
  );
});
