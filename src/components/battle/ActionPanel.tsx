import { memo } from 'react';

type ActionPanelProps = {
  density?: 'mobile' | 'tablet' | 'desktop';
  compact?: boolean;
  tournament?: boolean;
  highContrast?: boolean;
  basicName: string;
  skillName: string;
  skillCooldown: number;
  skillCooldownMax: number;
  ultTitle: string;
  ultReady: boolean;
  auto: boolean;
  canAct: boolean;
  autoSpeed: 1 | 2 | 3;
  autoSpeeds: readonly (1 | 2 | 3)[];
  onBasic: () => void;
  onSkill: () => void;
  onUlt?: () => void;
  onToggleAuto: () => void;
  onSetAutoSpeed: (speed: 1 | 2 | 3) => void;
  onExit: () => void;
};

function baseActionStyle(disabled: boolean, size: string) {
  return {
    width: size,
    height: size,
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.14)',
    padding: '4px',
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    display: 'grid',
    placeItems: 'center' as const,
    textAlign: 'center' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 120ms ease, transform 120ms ease, border-color 120ms ease',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '11px',
    lineHeight: 1.1,
    pointerEvents: 'auto' as const,
    zIndex: 2,
  };
}

export const ActionPanel = memo(function ActionPanel({
  density = 'mobile',
  compact = false,
  tournament = false,
  highContrast = false,
  basicName,
  skillName,
  skillCooldown,
  skillCooldownMax,
  ultTitle,
  ultReady,
  auto,
  canAct,
  autoSpeed,
  autoSpeeds,
  onBasic,
  onSkill,
  onUlt,
  onToggleAuto,
  onSetAutoSpeed,
  onExit,
}: ActionPanelProps) {
  const buttonSize = tournament
    ? compact
      ? '56px'
      : '62px'
    : compact
    ? '58px'
    : density === 'desktop'
    ? '72px'
    : density === 'tablet'
      ? '68px'
      : '64px';
  const skillDisabled = skillCooldown > 0 || !canAct;
  const skillPct = Math.max(0, Math.min(100, (skillCooldown / Math.max(1, skillCooldownMax)) * 100));
  const ultDisabled = !ultReady || !canAct || !onUlt;
  return (
    <section
      className="action-panel combat-panel"
      style={{
        width: '100%',
        maxWidth: compact ? '640px' : '740px',
        margin: '0 auto',
        borderRadius: '14px',
        background: 'rgba(20,20,25,0.9)',
        border: highContrast ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 18px 36px rgba(0,0,0,0.45)',
        padding: compact ? '8px' : '10px',
        boxSizing: 'border-box',
        display: 'grid',
        gap: compact ? '8px' : '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(8px, 3vw, 14px)', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onBasic}
          disabled={!canAct}
          style={{
            ...baseActionStyle(!canAct, buttonSize),
            background: 'linear-gradient(180deg, rgba(79,140,255,0.38), rgba(20,20,25,0.95))',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>⚔</span>
          <span>{compact ? 'ATK' : basicName}</span>
          {!canAct && <span style={{ position: 'absolute', inset: 0, borderRadius: '18px', background: 'rgba(0,0,0,0.4)' }} />}
        </button>
        <button
          type="button"
          onClick={onSkill}
          disabled={skillDisabled}
          style={{
            ...baseActionStyle(skillDisabled, buttonSize),
            background: 'linear-gradient(180deg, rgba(168,107,255,0.34), rgba(20,20,25,0.95))',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>✦</span>
          <span>{compact ? 'SKL' : skillName}</span>
          {skillCooldown > 0 && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '18px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                fontWeight: 900,
                color: '#f8fafc',
                background: `linear-gradient(180deg, rgba(0,0,0,0.4) ${100 - skillPct}%, rgba(0,0,0,0.72) ${100 - skillPct}%)`,
              }}
            >
              {skillCooldown}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onUlt?.()}
          disabled={ultDisabled}
          title={ultTitle}
          style={{
            ...baseActionStyle(ultDisabled, buttonSize),
            borderRadius: '14px',
            background: 'linear-gradient(180deg, rgba(255,106,241,0.34), rgba(20,20,25,0.95))',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>✶</span>
          <span style={{ fontSize: '11px', fontWeight: 900 }}>ULT</span>
          {ultDisabled && <span style={{ position: 'absolute', inset: 0, borderRadius: '14px', background: 'rgba(0,0,0,0.4)' }} />}
        </button>
        <button
          type="button"
          onClick={onExit}
          style={{
            ...baseActionStyle(false, buttonSize),
            background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(20,20,25,0.95))',
          }}
          title="Exit"
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>×</span>
          <span>Exit</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onToggleAuto}
          style={{
            minHeight: '36px',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.35)',
            background: auto ? 'rgba(79,140,255,0.42)' : 'rgba(20,20,25,0.92)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: compact ? '11px' : '12px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          AUTO {auto ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'inline-flex', gap: '4px', borderRadius: '10px', background: 'rgba(20,20,25,0.92)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px' }}>
          {autoSpeeds.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetAutoSpeed(speed)}
              style={{
                border: 'none',
                borderRadius: '8px',
                background: autoSpeed === speed ? 'rgba(79,140,255,0.92)' : 'transparent',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '11px',
                padding: '6px 8px',
                cursor: 'pointer',
              }}
            >
              x{speed}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});

