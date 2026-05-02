import { memo, type CSSProperties } from 'react';

type WalletPanelProps = {
  balance: number;
  crystals: number;
  coins: number;
  walletConnected: boolean;
  walletBusy: boolean;
  onWalletClick: () => void;
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 'clamp(6px, 1.8vw, 10px)',
  padding: '6px 10px',
  background: 'rgba(0,0,0,0.25)',
  borderRadius: '12px',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid rgba(148,163,184,0.22)',
  boxSizing: 'border-box',
};

const currencyItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: 'clamp(10px, 2.5vw, 12px)',
  fontWeight: 800,
  color: '#e2e8f0',
  whiteSpace: 'nowrap',
};

const iconStyle: CSSProperties = {
  fontSize: 'clamp(18px, 4.2vw, 20px)',
  lineHeight: 1,
};

export const WalletPanel = memo(function WalletPanel({
  balance,
  crystals,
  coins,
  walletConnected,
  walletBusy,
  onWalletClick,
}: WalletPanelProps) {
  return (
    <div style={panelStyle} aria-label="Панель валют и кошелька">
      <div style={currencyItemStyle}>
        <span style={iconStyle} aria-hidden>💰</span>
        <span style={{ color: '#22c55e' }}>{balance}</span>
      </div>
      <div style={currencyItemStyle}>
        <span style={iconStyle} aria-hidden>💎</span>
        <span style={{ color: '#ec4899' }}>{crystals}</span>
      </div>
      <div style={currencyItemStyle}>
        <span style={iconStyle} aria-hidden>🪙</span>
        <span style={{ color: '#facc15' }}>{coins}</span>
      </div>
      <button
        type="button"
        onClick={onWalletClick}
        disabled={walletBusy}
        style={{
          padding: '4px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(148,163,184,0.32)',
          background: walletConnected ? 'rgba(34,197,94,0.2)' : 'rgba(96,165,250,0.2)',
          color: '#e2e8f0',
          fontSize: 'clamp(10px, 2.5vw, 12px)',
          fontWeight: 800,
          cursor: walletBusy ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {walletBusy ? '…' : walletConnected ? 'Кошелек' : 'Подключить'}
      </button>
    </div>
  );
});
