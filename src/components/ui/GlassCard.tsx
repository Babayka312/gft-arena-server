import { memo, type CSSProperties, type ReactNode } from 'react';
import { Panel } from './Panel';

type GlassCardProps = {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};

export const GlassCard = memo(function GlassCard({ children, style, className }: GlassCardProps) {
  return (
    <Panel
      className={className}
      style={{
        background:
          'linear-gradient(140deg, rgba(10,15,42,0.76) 0%, rgba(26,31,60,0.72) 45%, rgba(77,25,87,0.34) 100%)',
        border: '1px solid rgba(168,107,255,0.34)',
        boxShadow: '0 0 22px rgba(168,107,255,0.26), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </Panel>
  );
});
