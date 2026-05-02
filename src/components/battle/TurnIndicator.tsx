import { memo } from 'react';

type TurnIndicatorProps = {
  turn: 'player' | 'bot' | 'ended';
};

export const TurnIndicator = memo(function TurnIndicator({ turn }: TurnIndicatorProps) {
  const playerTurn = turn === 'player';
  if (turn === 'ended') return null;
  return (
    <div
      className="turn-indicator text-panel"
      aria-label={playerTurn ? 'player turn' : 'enemy turn'}
      style={{
        position: 'absolute',
        left: '50%',
        top: '12px',
        transform: 'translateX(-50%)',
        zIndex: 300,
        pointerEvents: 'none',
        display: 'grid',
        justifyItems: 'center',
        gap: '8px',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '999px',
          background: playerTurn ? '#38bdf8' : '#f87171',
          boxShadow: playerTurn
            ? '0 0 20px rgba(56,189,248,0.55)'
            : '0 0 20px rgba(248,113,113,0.55)',
          opacity: 0.9,
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: playerTurn ? '14px solid #38bdf8' : 'none',
          borderBottom: playerTurn ? 'none' : '14px solid #f87171',
          opacity: 0.9,
          transform: playerTurn ? 'translateY(2px)' : 'translateY(-2px)',
        }}
      />
    </div>
  );
});

