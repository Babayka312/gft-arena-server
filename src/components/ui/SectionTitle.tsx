import { memo } from 'react';

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export const SectionTitle = memo(function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <h2
        style={{
          margin: 0,
          color: '#f8fafc',
          fontSize: 'clamp(18px, 4vw, 24px)',
          fontWeight: 900,
          letterSpacing: '0.03em',
          textShadow: '0 0 8px rgba(79,212,255,0.45)',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '12px', fontWeight: 600 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
});
