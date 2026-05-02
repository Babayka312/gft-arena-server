import { memo } from 'react';

type BattleFighter = {
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

type BattleMonsterPanelProps = {
  title: string;
  fighters: BattleFighter[];
  selectedUid?: string | null;
  activeUid?: string | null;
  onSelect?: (uid: string) => void;
  onFighterRef?: (uid: string, el: HTMLElement | null) => void;
  side: 'enemy' | 'player';
};

function hpBarColor(pct: number): string {
  if (pct <= 0.3) return '#ef4444';
  if (pct <= 0.6) return '#f59e0b';
  return '#22c55e';
}

function energyFillForFighter(fighter: BattleFighter): number {
  const cd = Math.max(0, fighter.cooldowns.skill || 0);
  if (cd === 0) return 100;
  if (cd >= 3) return 0;
  return cd === 2 ? 35 : 65;
}

export const BattleMonsterPanel = memo(function BattleMonsterPanel({
  title,
  fighters,
  selectedUid,
  activeUid,
  onSelect,
  onFighterRef,
  side,
}: BattleMonsterPanelProps) {
  return (
    <section
      style={{
        background: 'rgba(2,6,23,0.58)',
        border: `1px solid ${side === 'enemy' ? 'rgba(248,113,113,0.45)' : 'rgba(56,189,248,0.45)'}`,
        borderRadius: '12px',
        padding: '8px',
        display: 'grid',
        gap: '8px',
        width: 'min(94vw, 360px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: 'clamp(11px, 2.6vw, 13px)', fontWeight: 900, color: side === 'enemy' ? '#fecaca' : '#bae6fd' }}>{title}</div>
      {fighters.map((fighter) => {
        const hpPct = Math.max(0, Math.min(100, (fighter.hp / Math.max(1, fighter.maxHP)) * 100));
        const energyPct = energyFillForFighter(fighter);
        const isSelected = selectedUid === fighter.uid;
        const isActive = activeUid === fighter.uid;
        return (
          <button
            key={fighter.uid}
            type="button"
            ref={(el) => onFighterRef?.(fighter.uid, el)}
            onClick={() => onSelect?.(fighter.uid)}
            style={{
              border: isSelected
                ? '1px solid #eab308'
                : isActive
                  ? '1px solid #22d3ee'
                  : '1px solid rgba(71,85,105,0.65)',
              borderRadius: '10px',
              background: 'rgba(15,23,42,0.85)',
              padding: '8px',
              textAlign: 'left',
              cursor: onSelect ? 'pointer' : 'default',
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              gap: '8px',
              alignItems: 'center',
              boxSizing: 'border-box',
              opacity: fighter.hp > 0 ? 1 : 0.45,
              transform: isActive ? 'scale(1.01)' : 'none',
              transition: 'transform 120ms ease, opacity 120ms ease',
            }}
          >
            <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
              <img loading="lazy" decoding="async" src={fighter.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '4px',
                  fontSize: '12px',
                  padding: '1px 5px',
                  borderRadius: '999px',
                  background: 'rgba(2,6,23,0.8)',
                  color: '#f8fafc',
                  fontWeight: 800,
                }}
              >
                Lv.{fighter.stars ?? 1}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 'clamp(11px, 2.7vw, 13px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fighter.name}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 'clamp(10px, 2.4vw, 12px)' }}>{fighter.element}</span>
              </div>
              <div style={{ marginTop: '5px', height: '8px', borderRadius: '999px', background: 'rgba(30,41,59,0.95)', overflow: 'hidden' }}>
                <div style={{ width: `${hpPct}%`, height: '100%', background: hpBarColor(hpPct), transition: 'width 140ms linear' }} />
              </div>
              <div style={{ marginTop: '4px', height: '4px', borderRadius: '999px', background: 'rgba(30,41,59,0.95)', overflow: 'hidden' }}>
                <div style={{ width: `${energyPct}%`, height: '100%', background: '#38bdf8', transition: 'width 140ms linear' }} />
              </div>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '16px' }}>
                  {fighter.stunnedTurns > 0 && <span title="Оглушение" style={{ fontSize: '16px', lineHeight: 1 }}>💫</span>}
                  {fighter.dotTurns > 0 && <span title="DOT" style={{ fontSize: '16px', lineHeight: 1 }}>☠️</span>}
                  {fighter.shield > 0 && <span title="Щит" style={{ fontSize: '16px', lineHeight: 1 }}>🛡️</span>}
                  {fighter.cooldowns.skill > 0 && (
                    <span title={`КД навыка: ${fighter.cooldowns.skill}`} style={{ fontSize: '16px', lineHeight: 1 }}>⏳</span>
                  )}
                </div>
                <span style={{ color: '#cbd5e1', fontSize: 'clamp(10px, 2.4vw, 12px)', fontVariantNumeric: 'tabular-nums' }}>
                  {fighter.hp}/{fighter.maxHP}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
});
