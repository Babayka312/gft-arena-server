import { memo } from 'react';

type BattleActionsProps = {
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
  onSkip: () => void;
};

const actionBtnBase = {
  width: 'clamp(64px, 18vw, 72px)',
  height: 'clamp(64px, 18vw, 72px)',
  borderRadius: '18px',
  border: '1px solid rgba(148,163,184,0.35)',
  color: '#f8fafc',
  fontWeight: 800,
  fontSize: 'clamp(10px, 2.5vw, 12px)',
  cursor: 'pointer',
  position: 'relative' as const,
  display: 'grid',
  placeItems: 'center' as const,
  textAlign: 'center' as const,
  lineHeight: 1.15,
  padding: '4px',
  boxSizing: 'border-box' as const,
  transition: 'transform 120ms ease, opacity 120ms ease',
};

export const BattleActions = memo(function BattleActions({
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
  onSkip,
}: BattleActionsProps) {
  const skillDisabled = skillCooldown > 0;
  const skillPct = Math.max(0, Math.min(100, (skillCooldown / Math.max(1, skillCooldownMax)) * 100));
  return (
    <section
      style={{
        width: '100%',
        display: 'grid',
        gap: '10px',
        justifyItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(8px, 4vw, 16px)', width: '100%' }}>
        <button
          type="button"
          onClick={onBasic}
          disabled={!canAct}
          style={{ ...actionBtnBase, background: 'rgba(234,88,12,0.7)', opacity: canAct ? 1 : 0.6, cursor: canAct ? 'pointer' : 'not-allowed' }}
        >
          ⚔️
          <span style={{ fontSize: '10px', color: '#e2e8f0' }}>{basicName}</span>
        </button>
        <button
          type="button"
          onClick={onSkill}
          disabled={skillDisabled || !canAct}
          style={{
            ...actionBtnBase,
            background: 'rgba(124,58,237,0.72)',
            opacity: skillDisabled ? 0.6 : 1,
            cursor: skillDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          ✨
          <span style={{ fontSize: '10px', color: '#e2e8f0' }}>{skillName}</span>
          {skillDisabled && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '18px',
                background: `linear-gradient(180deg, rgba(2,6,23,0.42) ${100 - skillPct}%, rgba(2,6,23,0.8) ${100 - skillPct}%)`,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
              }}
            >
              {skillCooldown}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onUlt?.()}
          disabled={!ultReady || !onUlt || !canAct}
          style={{
            ...actionBtnBase,
            background: 'rgba(234,179,8,0.7)',
            color: '#0b1120',
            opacity: ultReady ? 1 : 0.6,
            cursor: ultReady && canAct ? 'pointer' : 'not-allowed',
          }}
          title={ultTitle}
        >
          ⭐
          <span style={{ fontSize: '10px', color: ultReady ? '#0b1120' : '#e2e8f0' }}>ULT</span>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onToggleAuto}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.35)',
            background: auto ? 'rgba(34,197,94,0.65)' : 'rgba(71,85,105,0.8)',
            color: '#f8fafc',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {auto ? 'Авто ВКЛ' : 'Авто'}
        </button>
        <div style={{ display: 'inline-flex', gap: '4px', background: 'rgba(2,6,23,0.72)', borderRadius: '10px', padding: '4px' }}>
          {autoSpeeds.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetAutoSpeed(speed)}
              style={{
                padding: '6px 8px',
                border: 'none',
                borderRadius: '8px',
                background: autoSpeed === speed ? '#eab308' : 'transparent',
                color: autoSpeed === speed ? '#0b1120' : '#cbd5e1',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              x{speed}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.45)',
            background: 'rgba(185,28,28,0.65)',
            color: '#fee2e2',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Выход
        </button>
      </div>
    </section>
  );
});
