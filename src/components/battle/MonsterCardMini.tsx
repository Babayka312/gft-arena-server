import { memo } from 'react';

type Fighter = {
  uid: string;
  name: string;
  image: string;
  element: string;
  hp: number;
  maxHP: number;
  stars?: number;
};

type MonsterCardMiniProps = {
  fighter: Fighter;
  portraitSize: number;
  hpHeight: number;
  selected: boolean;
  active: boolean;
  dead: boolean;
  onSelect?: (uid: string) => void;
  onRef?: (uid: string, el: HTMLElement | null) => void;
};

function getHpFillColor(pct: number): string {
  if (pct <= 33) return '#ef4444';
  if (pct <= 66) return '#f59e0b';
  return '#22c55e';
}

export const MonsterCardMini = memo(function MonsterCardMini({
  fighter,
  portraitSize,
  hpHeight,
  selected,
  active,
  dead,
  onSelect,
  onRef,
}: MonsterCardMiniProps) {
  const hpPct = Math.max(0, Math.min(100, (fighter.hp / Math.max(1, fighter.maxHP)) * 100));
  return (
    <button
      type="button"
      ref={(el) => onRef?.(fighter.uid, el)}
      onClick={() => onSelect?.(fighter.uid)}
      className="combat-panel"
      style={{
        width: '100%',
        borderRadius: '12px',
        border: selected
          ? '1px solid rgba(79,140,255,0.9)'
          : active
            ? '1px solid rgba(168,107,255,0.85)'
            : '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(20,20,25,0.94)',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: `${portraitSize}px 1fr`,
        gap: '8px',
        alignItems: 'center',
        cursor: onSelect ? 'pointer' : 'default',
        opacity: dead ? 0.55 : 1,
        transform: active ? 'translateY(-1px)' : 'none',
        transition: 'transform 130ms ease, border-color 130ms ease, opacity 130ms ease',
      }}
    >
      <div
        style={{
          width: `${portraitSize}px`,
          height: `${portraitSize}px`,
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          background: '#121218',
          position: 'relative',
        }}
      >
        <img
          loading="lazy"
          decoding="async"
          src={fighter.image}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(0.88) contrast(1.04)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: '4px',
            top: '4px',
            fontSize: '10px',
            lineHeight: 1,
            color: '#fff',
            background: 'rgba(0,0,0,0.72)',
            borderRadius: '999px',
            padding: '2px 5px',
          }}
        >
          {fighter.element}
        </span>
        <span
          style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            fontSize: '10px',
            fontWeight: 800,
            color: '#fff',
            background: 'rgba(0,0,0,0.72)',
            borderRadius: '999px',
            padding: '2px 5px',
          }}
        >
          Lv.{fighter.stars ?? 1}
        </span>
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fighter.name}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontSize: '12px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fighter.hp}/{fighter.maxHP}
          </div>
        </div>
        <div
          style={{
            marginTop: '6px',
            height: `${hpHeight}px`,
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${hpPct}%`,
              height: '100%',
              borderRadius: '6px',
              background: `linear-gradient(90deg, ${getHpFillColor(hpPct)} 0%, ${getHpFillColor(hpPct)}cc 100%)`,
              transition: 'width 180ms ease-out',
            }}
          />
        </div>
      </div>
    </button>
  );
});
