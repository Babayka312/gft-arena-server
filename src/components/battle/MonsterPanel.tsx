import { memo, useEffect, useRef, useState } from 'react';

type Fighter = {
  uid: string;
  name: string;
  image: string;
  element: string;
  hp: number;
  maxHP: number;
  shield: number;
  stunnedTurns: number;
  dotTurns: number;
  cooldowns: { skill: number };
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

function getHpColor(pct: number): string {
  if (pct <= 33) return '#ef4444';
  if (pct <= 66) return '#f59e0b';
  return '#22c55e';
}

function getEnergyPct(fighter: Fighter): number {
  const cd = Math.max(0, fighter.cooldowns.skill || 0);
  if (cd === 0) return 100;
  if (cd >= 3) return 0;
  return cd === 2 ? 34 : 67;
}

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
  const portraitSize = compact ? 66 : density === 'desktop' ? 86 : density === 'tablet' ? 82 : 74;
  const cardMinWidth = compact ? 188 : density === 'desktop' ? 250 : density === 'tablet' ? 236 : 214;
  const hpHeight = compact ? 12 : density === 'desktop' ? 18 : density === 'tablet' ? 16 : 14;
  const statusSize = density === 'desktop' ? 20 : 18;
  const previousHpRef = useRef<Map<string, number>>(new Map());
  const [hpFxByUid, setHpFxByUid] = useState<Record<string, 'hit' | 'heal'>>({});

  useEffect(() => {
    const prev = previousHpRef.current;
    const fx: Record<string, 'hit' | 'heal'> = {};
    for (const f of fighters) {
      const before = prev.get(f.uid);
      if (typeof before === 'number') {
        if (f.hp < before) fx[f.uid] = 'hit';
        if (f.hp > before) fx[f.uid] = 'heal';
      }
      prev.set(f.uid, f.hp);
    }
    if (Object.keys(fx).length > 0) {
      setHpFxByUid((old) => ({ ...old, ...fx }));
      const timer = window.setTimeout(() => {
        setHpFxByUid((old) => {
          const next = { ...old };
          Object.keys(fx).forEach((k) => { delete next[k]; });
          return next;
        });
      }, 280);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [fighters]);

  const statusBadge = (label: string, bg: string, title: string) => (
    <span
      title={title}
      style={{
        width: `${statusSize}px`,
        height: `${statusSize}px`,
        borderRadius: '999px',
        background: bg,
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: density === 'desktop' ? '10px' : '9px',
        color: '#f8fafc',
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
  const accent = highContrast
    ? side === 'enemy' ? '#ef4444' : '#38bdf8'
    : side === 'enemy' ? 'rgba(248,113,113,0.42)' : 'rgba(56,189,248,0.42)';

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '980px',
        margin: '0 auto',
        borderRadius: '14px',
        border: `1px solid ${accent}`,
        background: highContrast ? 'rgba(2,6,23,0.78)' : 'rgba(2,6,23,0.5)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.24)',
        padding: compact ? '6px' : '8px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: compact ? '11px' : 'clamp(11px, 2.3vw, 13px)', fontWeight: 900, color: highContrast ? '#f8fafc' : side === 'enemy' ? '#fecaca' : '#bae6fd', marginBottom: compact ? '6px' : '8px', letterSpacing: '0.03em' }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: density === 'desktop' ? '10px' : '8px', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${cardMinWidth}px), 1fr))` }}>
        {fighters.map((fighter) => {
          const hpPct = Math.max(0, Math.min(100, (fighter.hp / Math.max(1, fighter.maxHP)) * 100));
          const energyPct = getEnergyPct(fighter);
          const isSelected = selectedUid === fighter.uid;
          const isActive = activeUid === fighter.uid;
          const isDead = fighter.hp <= 0;
          return (
            <button
              key={fighter.uid}
              type="button"
              ref={(el) => onFighterRef?.(fighter.uid, el)}
              onClick={() => onSelect?.(fighter.uid)}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: isSelected
                  ? '1px solid #facc15'
                  : isActive
                    ? '1px solid #22d3ee'
                    : '1px solid rgba(71,85,105,0.7)',
                background: 'rgba(15,23,42,0.82)',
                boxSizing: 'border-box',
                padding: compact ? '6px' : '8px',
                cursor: onSelect ? 'pointer' : 'default',
                display: 'grid',
                gridTemplateColumns: `${portraitSize}px 1fr`,
                gap: '8px',
                alignItems: 'center',
                opacity: isDead ? 0.5 : 1,
                transform: isActive ? 'translateY(-1px)' : 'none',
                transition: 'transform 120ms ease, opacity 120ms ease',
              }}
            >
              <div style={{ position: 'relative', width: `${portraitSize}px`, height: `${portraitSize}px`, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(148,163,184,0.28)', background: 'rgba(2,6,23,0.55)' }}>
                <img
                  loading="lazy"
                  decoding="async"
                  src={fighter.image}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isActive ? 'scale(1.04)' : 'scale(1.01)',
                    filter: highContrast ? 'contrast(1.04)' : 'none',
                    transition: 'transform 140ms ease, filter 120ms ease',
                  }}
                />
                <span style={{ position: 'absolute', left: '4px', top: '4px', fontSize: compact ? '11px' : '13px', lineHeight: 1, background: 'rgba(2,6,23,0.78)', borderRadius: '999px', padding: '2px 5px' }}>
                  {fighter.element}
                </span>
                <span style={{ position: 'absolute', right: '4px', top: '4px', fontSize: '11px', fontWeight: 800, color: '#e2e8f0', background: 'rgba(2,6,23,0.78)', borderRadius: '999px', padding: '2px 5px' }}>
                  Lv.{fighter.stars ?? 1}
                </span>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: compact ? '12px' : 'clamp(12px, 2.4vw, 14px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fighter.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>
                    {fighter.hp}/{fighter.maxHP}
                  </div>
                </div>
                <div style={{ marginTop: '6px', height: `${hpHeight}px`, borderRadius: '8px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${hpPct}%`,
                      height: '100%',
                      borderRadius: '8px',
                      background: `linear-gradient(90deg, ${getHpColor(hpPct)} 0%, ${getHpColor(hpPct)}cc 100%)`,
                      transition: 'width 170ms ease-out, opacity 120ms ease-out, transform 120ms ease-out',
                      transformOrigin: 'left center',
                      opacity: highContrast ? 1 : 0.96,
                      boxShadow:
                        hpFxByUid[fighter.uid] === 'hit'
                          ? 'inset 0 0 0 999px rgba(127,29,29,0.22)'
                          : hpFxByUid[fighter.uid] === 'heal'
                            ? 'inset 0 0 0 999px rgba(20,83,45,0.18)'
                            : 'none',
                    }}
                  />
                </div>
                <div style={{ marginTop: '4px', height: '5px', borderRadius: '999px', background: 'rgba(148,163,184,0.22)', overflow: 'hidden' }}>
                  <div style={{ width: `${energyPct}%`, height: '100%', borderRadius: '999px', background: '#38bdf8', transition: 'width 150ms linear' }} />
                </div>
                <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: `${statusSize}px` }}>
                  {fighter.stunnedTurns > 0 && statusBadge('ST', 'rgba(168,85,247,0.9)', 'Оглушение')}
                  {fighter.dotTurns > 0 && statusBadge('DOT', 'rgba(239,68,68,0.9)', 'Урон со временем')}
                  {fighter.shield > 0 && statusBadge('SH', 'rgba(14,165,233,0.9)', 'Щит')}
                  {fighter.cooldowns.skill > 0 && statusBadge(String(fighter.cooldowns.skill), 'rgba(100,116,139,0.9)', `КД навыка: ${fighter.cooldowns.skill}`)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});

