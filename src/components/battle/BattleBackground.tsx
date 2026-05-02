import { memo, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Background } from '../ui/Background';

type BattleBackgroundProps = {
  background: string;
  contentInset: CSSProperties;
  arenaRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

export const BattleBackground = memo(function BattleBackground({
  background,
  contentInset,
  arenaRef,
  children,
}: BattleBackgroundProps) {
  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(7,10,22,0.45) 0%, rgba(7,10,22,0.58) 100%)"
      ref={arenaRef}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        ...contentInset,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
        }}
      >
        {children}
      </div>
    </Background>
  );
});

