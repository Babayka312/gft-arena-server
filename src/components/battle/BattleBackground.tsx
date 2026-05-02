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
      className="battle-bg"
      background={background}
      gradient="linear-gradient(180deg, rgba(6,8,14,0.62) 0%, rgba(6,8,14,0.72) 100%)"
      ref={arenaRef}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        filter: 'saturate(0.78)',
        ...contentInset,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 100,
        }}
      >
        {children}
      </div>
    </Background>
  );
});

