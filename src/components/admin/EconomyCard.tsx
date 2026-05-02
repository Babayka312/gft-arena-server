import { memo, type ReactNode } from 'react';

type EconomyCardProps = {
  title: string;
  value?: string;
  subtitle?: string;
  warning?: string | null;
  children?: ReactNode;
};

export const EconomyCard = memo(function EconomyCard({
  title,
  value,
  subtitle,
  warning,
  children,
}: EconomyCardProps) {
  return (
    <section
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(71,85,105,0.6)',
        background: 'rgba(15,23,42,0.82)',
        boxShadow: '0 10px 26px rgba(0,0,0,0.3)',
        padding: '12px',
        display: 'grid',
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
        {title}
      </div>
      {value && <div style={{ fontSize: 'clamp(18px, 4.4vw, 24px)', color: '#f8fafc', fontWeight: 900 }}>{value}</div>}
      {subtitle && <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.35 }}>{subtitle}</div>}
      {warning && (
        <div style={{ borderRadius: '10px', border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', fontSize: '11px', fontWeight: 700, padding: '6px 8px' }}>
          {warning}
        </div>
      )}
      {children}
    </section>
  );
});

