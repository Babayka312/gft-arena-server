import { memo, type CSSProperties } from 'react';

type BattleTopBarProps = {
  opponentName: string;
  round: number;
  maxRounds: number;
  elementIcon?: string;
  rating?: number;
  onExit: () => void;
};

const barStyle: CSSProperties = {
  height: '48px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 12px',
  background: 'rgba(15,23,42,0.72)',
  borderBottom: '1px solid rgba(148,163,184,0.22)',
  boxSizing: 'border-box',
};

export const BattleTopBar = memo(function BattleTopBar({
  opponentName,
  round,
  maxRounds,
  elementIcon = '⚔️',
  rating,
  onExit,
}: BattleTopBarProps) {
  return (
    <div style={barStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span aria-hidden style={{ fontSize: '20px', lineHeight: 1 }}>{elementIcon}</span>
        <div style={{ minWidth: 0, lineHeight: 1.1 }}>
          <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 'clamp(12px, 3vw, 14px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {opponentName}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 'clamp(10px, 2.4vw, 12px)' }}>
            Раунд {round}/{maxRounds}{typeof rating === 'number' ? ` · ${rating} ELO` : ''}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onExit}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          border: '1px solid rgba(239,68,68,0.45)',
          background: 'rgba(127,29,29,0.55)',
          color: '#fee2e2',
          fontWeight: 900,
          fontSize: '16px',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  );
});
