import { memo, useEffect, useRef, useState } from 'react';

type BattleLogProps = {
  events: string[];
  maxItems?: number;
  density?: 'mobile' | 'tablet' | 'desktop';
};

export const BattleLog = memo(function BattleLog({
  events,
  maxItems = 5,
  density = 'mobile',
}: BattleLogProps) {
  const [visible, setVisible] = useState<Array<{ id: string; text: string; at: number }>>([]);
  const prevLenRef = useRef(0);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    prevLenRef.current = events.length;
    if (events.length <= prevLen) return;
    const added = events.slice(prevLen).map((line, i) => ({
      id: `${Date.now()}-${i}-${line.slice(0, 14)}`,
      text: line,
      at: Date.now(),
    }));
    setVisible((prev) => [...prev, ...added].slice(-maxItems));
  }, [events, maxItems]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setVisible((prev) => prev.filter((row) => now - row.at <= 12000).slice(-maxItems));
    }, 600);
    return () => window.clearInterval(id);
  }, [maxItems]);

  const list = [...visible].reverse();
  return (
    <section
      className="battle-log text-panel"
      style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 400,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderRadius: '8px',
        padding: '6px 10px',
        border: '1px solid rgba(148,163,184,0.2)',
        width: density === 'desktop' ? '340px' : density === 'tablet' ? '320px' : 'min(78vw, 300px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'grid', gap: '4px' }}>
        {list.map((row, idx) => (
          <div
            key={row.id}
            style={{
              fontSize: density === 'desktop' ? '14px' : '12px',
              lineHeight: 1.3,
              color: idx === 0 ? '#f8fafc' : '#cbd5e1',
              opacity: idx === 0 ? 1 : 0.75,
              transform: idx === 0 ? 'translateY(0)' : 'translateY(1px)',
              animation: 'battleLogFadeIn 180ms ease-out',
              transition: 'opacity 160ms ease, transform 160ms ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={row.text}
          >
            {row.text}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes battleLogFadeIn {
          0% { opacity: 0; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
});
