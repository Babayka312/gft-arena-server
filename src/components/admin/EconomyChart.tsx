import { memo } from 'react';

type Datum = { label: string; value: number; color?: string };
type ChartKind = 'line' | 'bar' | 'pie';

type EconomyChartProps = {
  type: ChartKind;
  data: Datum[];
  height?: number;
};

export const EconomyChart = memo(function EconomyChart({
  type,
  data,
  height = 170,
}: EconomyChartProps) {
  const safeData = data.length ? data : [{ label: 'No data', value: 0 }];
  const max = Math.max(1, ...safeData.map((d) => Math.max(0, d.value)));
  const w = 100;
  const h = 100;

  if (type === 'pie') {
    const total = safeData.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
    let acc = 0;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) 1fr', gap: '10px', alignItems: 'center' }}>
        <svg viewBox="0 0 42 42" style={{ width: '100%', height: `${Math.max(120, height - 20)}px` }}>
          {safeData.map((d, i) => {
            const value = Math.max(0, d.value);
            const ratio = value / total;
            const dash = `${ratio * 100} ${100 - ratio * 100}`;
            const seg = (
              <circle
                key={d.label + i}
                r="15.915"
                cx="21"
                cy="21"
                fill="transparent"
                stroke={d.color || `hsl(${(i * 67) % 360} 72% 58%)`}
                strokeWidth="7"
                strokeDasharray={dash}
                strokeDashoffset={`${25 - acc * 100}`}
              />
            );
            acc += ratio;
            return seg;
          })}
        </svg>
        <div style={{ display: 'grid', gap: '6px' }}>
          {safeData.map((d, i) => (
            <div key={d.label + i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: d.color || `hsl(${(i * 67) % 360} 72% 58%)` }} />
              <span style={{ opacity: 0.9 }}>{d.label}</span>
              <strong style={{ marginLeft: 'auto', color: '#f8fafc' }}>{Math.round(d.value).toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const points = safeData
    .map((d, i) => {
      const x = (i / Math.max(1, safeData.length - 1)) * w;
      const y = h - (Math.max(0, d.value) / max) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: `${height}px`, background: 'rgba(2,6,23,0.52)', borderRadius: '10px', border: '1px solid rgba(71,85,105,0.45)' }}>
        {type === 'bar' ? (
          safeData.map((d, i) => {
            const bw = w / safeData.length - 1.5;
            const x = i * (w / safeData.length);
            const vh = (Math.max(0, d.value) / max) * h;
            return (
              <rect
                key={d.label + i}
                x={x}
                y={h - vh}
                width={Math.max(1, bw)}
                height={vh}
                rx="1"
                fill={d.color || '#60a5fa'}
                opacity="0.85"
              />
            );
          })
        ) : (
          <>
            <polyline fill="none" stroke="#60a5fa" strokeWidth="2.2" points={points} />
            {safeData.map((d, i) => {
              const x = (i / Math.max(1, safeData.length - 1)) * w;
              const y = h - (Math.max(0, d.value) / max) * h;
              return <circle key={d.label + i} cx={x} cy={y} r="1.8" fill="#22d3ee" />;
            })}
          </>
        )}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, safeData.length)}, minmax(0, 1fr))`, gap: '4px', fontSize: '10px', color: '#94a3b8' }}>
        {safeData.slice(-5).map((d, i) => (
          <div key={d.label + i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
});

