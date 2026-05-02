import { memo } from 'react';

type TurnIndicatorProps = {
  turn: 'player' | 'bot' | 'ended';
};

export const TurnIndicator = memo(function TurnIndicator({ turn }: TurnIndicatorProps) {
  const playerTurn = turn === 'player';
  if (turn === 'ended') return null;
  return (
    <div
      className="turn-indicator"
      aria-label={playerTurn ? 'player turn' : 'enemy turn'}
      style={{
        position: 'absolute',
        left: '50%',
        top: '14px',
        transform: 'translateX(-50%)',
        zIndex: 300,
        pointerEvents: 'none',
        display: 'grid',
        justifyItems: 'center',
        gap: '6px',
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '999px',
          background: playerTurn ? '#4f8cff' : '#a86bff',
          boxShadow: playerTurn
            ? '0 0 12px rgba(79,140,255,0.5)'
            : '0 0 12px rgba(168,107,255,0.52)',
          opacity: 0.85,
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: playerTurn ? '12px solid #4f8cff' : 'none',
          borderBottom: playerTurn ? 'none' : '12px solid #a86bff',
          opacity: 0.85,
          transform: playerTurn ? 'translateY(2px)' : 'translateY(-2px)',
        }}
      />
    </div>
  );
});

