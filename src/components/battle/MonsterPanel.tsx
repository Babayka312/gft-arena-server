import { memo } from 'react';
import { MonsterCardMini } from './MonsterCardMini';

type Fighter = {
  uid: string;
  name: string;
  image: string;
  element: string;
  hp: number;
  maxHP: number;
  stars?: number;
};

type MonsterPanelProps = {
  title: string;
  side: 'enemy' | 'player';
  density?: 'mobile' | 'tablet' | 'desktop';
  compact?: boolean;
  highContrast?: boolean;
  fighters: Fighter[];
  selectedUid?: string | null;
  activeUid?: string | null;
  onSelect?: (uid: string) => void;
  onFighterRef?: (uid: string, el: HTMLElement | null) => void;
};

export const MonsterPanel = memo(function MonsterPanel({
  title,
  side,
  density = 'mobile',
  compact = false,
  highContrast = false,
  fighters,
  selectedUid,
  activeUid,
  onSelect,
  onFighterRef,
}: MonsterPanelProps) {
  const portraitSize = compact ? 60 : density === 'desktop' ? 76 : density === 'tablet' ? 72 : 66;
  const cardMinWidth = compact ? 188 : density === 'desktop' ? 250 : density === 'tablet' ? 236 : 214;
  const hpHeight = 12;
  const accent = highContrast
    ? side === 'enemy'
      ? '#4f8cff'
      : '#a86bff'
    : 'rgba(255,255,255,0.16)';

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '980px',
        margin: '0 auto',
        borderRadius: '14px',
        border: `1px solid ${accent}`,
        background: 'rgba(20,20,25,0.88)',
        boxShadow: '0 14px 34px rgba(0,0,0,0.4)',
        padding: compact ? '6px' : '8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: compact ? '11px' : '13px',
          fontWeight: 800,
          color: '#fff',
          marginBottom: compact ? '6px' : '8px',
          letterSpacing: '0.03em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'grid',
          gap: density === 'desktop' ? '10px' : '8px',
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${cardMinWidth}px), 1fr))`,
        }}
      >
        {fighters.map((fighter) => {
          const isSelected = selectedUid === fighter.uid;
          const isActive = activeUid === fighter.uid;
          const isDead = fighter.hp <= 0;
          return (
            <MonsterCardMini
              key={fighter.uid}
              fighter={fighter}
              portraitSize={portraitSize}
              hpHeight={hpHeight}
              selected={isSelected}
              active={isActive}
              dead={isDead}
              onSelect={onSelect}
              onRef={onFighterRef}
            />
          );
        })}
      </div>
    </section>
  );
});

