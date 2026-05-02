import { memo, type CSSProperties, type ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export const Panel = memo(function Panel({ children, style, className }: PanelProps) {
  return (
    <section
      className={className}
      style={{
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(79,212,255,0.22)',
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: '0 0 24px rgba(79,212,255,0.24)',
        ...style,
      }}
    >
      {children}
    </section>
  );
});
