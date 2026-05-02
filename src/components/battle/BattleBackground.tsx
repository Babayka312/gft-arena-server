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
      gradient="linear-gradient(180deg, rgba(7,10,22,0.45) 0%, rgba(7,10,22,0.58) 100%)"
      ref={arenaRef}
      style={{
        position: 'relative',
        boxSizing: 'border-box',
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

