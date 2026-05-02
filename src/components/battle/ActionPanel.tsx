import { memo } from 'react';

type ActionPanelProps = {
  density?: 'mobile' | 'tablet' | 'desktop';
  compact?: boolean;
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
    borderRadius: '18px',
    border: '1px solid rgba(148,163,184,0.35)',
    padding: '4px',
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    display: 'grid',
    placeItems: 'center' as const,
    textAlign: 'center' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'opacity 120ms ease, transform 120ms ease',
    color: '#f8fafc',
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
  const buttonSize = compact
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
      className="action-panel text-panel"
      style={{
        width: '100%',
        maxWidth: compact ? '640px' : '740px',
        margin: '0 auto',
        borderRadius: '14px',
        background: highContrast ? 'rgba(2,6,23,0.82)' : 'rgba(2,6,23,0.58)',
        border: highContrast ? '1px solid rgba(226,232,240,0.42)' : '1px solid rgba(148,163,184,0.24)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
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
            background: highContrast
              ? 'linear-gradient(180deg, #f97316, #b45309)'
              : 'linear-gradient(180deg, rgba(249,115,22,0.82), rgba(194,65,12,0.8))',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>⚔️</span>
          <span>{compact ? 'ATK' : basicName}</span>
          {!canAct && <span style={{ position: 'absolute', inset: 0, borderRadius: '18px', background: 'rgba(0,0,0,0.4)' }} />}
        </button>
        <button
          type="button"
          onClick={onSkill}
          disabled={skillDisabled}
          style={{
            ...baseActionStyle(skillDisabled, buttonSize),
            background: highContrast
              ? 'linear-gradient(180deg, #8b5cf6, #5b21b6)'
              : 'linear-gradient(180deg, rgba(124,58,237,0.84), rgba(91,33,182,0.8))',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>✨</span>
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
            ...baseActionStyle(ultDisabled, compact ? '64px' : density === 'desktop' ? '84px' : density === 'tablet' ? '80px' : '76px'),
            borderRadius: '22px',
            background: highContrast
              ? 'linear-gradient(180deg, #facc15, #d97706)'
              : 'linear-gradient(180deg, rgba(250,204,21,0.88), rgba(217,119,6,0.82))',
            color: '#0b1120',
          }}
        >
          <span style={{ fontSize: '24px', lineHeight: 1 }}>⭐</span>
          <span style={{ fontSize: '11px', fontWeight: 900 }}>ULT</span>
          {ultDisabled && <span style={{ position: 'absolute', inset: 0, borderRadius: '22px', background: 'rgba(0,0,0,0.4)' }} />}
        </button>
        <button
          type="button"
          onClick={onExit}
          style={{
            ...baseActionStyle(false, buttonSize),
            background: highContrast
              ? 'linear-gradient(180deg, #ef4444, #991b1b)'
              : 'linear-gradient(180deg, rgba(185,28,28,0.82), rgba(127,29,29,0.8))',
          }}
          title="Exit"
        >
          <span style={{ fontSize: '22px', lineHeight: 1 }}>×</span>
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
            background: auto ? 'rgba(34,197,94,0.7)' : 'rgba(71,85,105,0.75)',
            color: '#f8fafc',
            fontWeight: 900,
            fontSize: compact ? '11px' : '12px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          AUTO {auto ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'inline-flex', gap: '4px', borderRadius: '10px', background: 'rgba(2,6,23,0.72)', border: '1px solid rgba(71,85,105,0.65)', padding: '4px' }}>
          {autoSpeeds.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetAutoSpeed(speed)}
              style={{
                border: 'none',
                borderRadius: '8px',
                background: autoSpeed === speed ? '#facc15' : 'transparent',
                color: autoSpeed === speed ? '#0b1120' : '#cbd5e1',
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

