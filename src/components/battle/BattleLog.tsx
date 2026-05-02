import { memo } from 'react';

type BattleLogProps = {
  events: string[];
  maxItems?: number;
};

export const BattleLog = memo(function BattleLog({
  events,
  maxItems = 5,
}: BattleLogProps) {
  const list = events.slice(-maxItems).reverse();
  return (
    <section
      style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '8px',
        padding: '6px 10px',
        border: '1px solid rgba(148,163,184,0.2)',
        width: 'min(78vw, 320px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'grid', gap: '4px' }}>
        {list.map((line, idx) => (
          <div
            key={`${idx}-${line.slice(0, 16)}`}
            style={{
              fontSize: 'clamp(12px, 2.8vw, 14px)',
              lineHeight: 1.3,
              color: idx === 0 ? '#f8fafc' : '#cbd5e1',
              opacity: idx === 0 ? 1 : 0.75,
              transform: idx === 0 ? 'translateY(0)' : 'translateY(1px)',
              transition: 'opacity 120ms ease, transform 120ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={line}
          >
            {line}
          </div>
        ))}
      </div>
    </section>
  );
});
