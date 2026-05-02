import { memo, useEffect, useState, type CSSProperties, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { BattleBackground } from '../components/battle/BattleBackground';
import { MonsterPanel } from '../components/battle/MonsterPanel';
import { ActionPanel } from '../components/battle/ActionPanel';
import { BattleLog } from '../components/battle/BattleLog';
import { TurnIndicator } from '../components/battle/TurnIndicator';
import { BG_PATHS } from '../ui/backgrounds';

type BattleScreenProps = {
  cardBattle: any;
  quality: 'high' | 'medium' | 'low';
  maxRounds: number;
  autoSpeeds: readonly (1 | 2 | 3)[];
  mainInsets: { top: number; bottom: number };
  mainScrollPadding: CSSProperties;
  finisherDelayMs: number;
  battleArenaRef: RefObject<HTMLDivElement | null>;
  fighterCardRefs: MutableRefObject<Map<string, HTMLElement>>;
  vfxNode?: ReactNode;
  renderTracer: (lastAttack: any) => ReactNode;
  ultTitle: string;
  onExit: () => void;
  onSelectTarget: (uid: string) => void;
  onSelectAlly: (uid: string) => void;
  onBasic: () => void;
  onSkill: () => void;
  onUlt?: () => void;
  onToggleAuto: () => void;
  onSetAutoSpeed: (speed: 1 | 2 | 3) => void;
};

export const BattleScreen = memo(function BattleScreen({
  cardBattle,
  quality,
  maxRounds,
  autoSpeeds,
  mainInsets,
  mainScrollPadding,
  finisherDelayMs,
  battleArenaRef,
  fighterCardRefs,
  vfxNode,
  renderTracer,
  ultTitle,
  onExit,
  onSelectTarget,
  onSelectAlly,
  onBasic,
  onSkill,
  onUlt,
  onToggleAuto,
  onSetAutoSpeed,
}: BattleScreenProps) {
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  );
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewport(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-contrast: more)');
    const onChange = () => setHighContrast(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);
  const density: 'mobile' | 'tablet' | 'desktop' =
    viewport >= 1200 ? 'desktop' : viewport >= 760 ? 'tablet' : 'mobile';
  const compact = viewport < 390;
  const qualityMultiplier = quality === 'high' ? 1 : quality === 'medium' ? 0.72 : 0.45;
  const showHeavyEffects = quality !== 'low';
  const active = cardBattle.playerTeam.find((x: any) => x.uid === cardBattle.activeFighterUid && x.hp > 0);
  const basicName = active?.abilities.basic.name ?? 'Удар';
  const skillName = active?.abilities.skill.name ?? 'Навык';
  const skillCd = active?.cooldowns.skill ?? 0;
  const skillMaxCd = active?.abilities.skill.cooldownTurns ?? 1;
  const canAct = cardBattle.turn === 'player' && !cardBattle.auto && Boolean(active);

  return (
    <BattleBackground
      background={BG_PATHS.arena}
      contentInset={mainScrollPadding}
      arenaRef={battleArenaRef}
    >
      <style>{`
        @keyframes tracerLine {
          0% { transform: translate(0, -50%) rotate(var(--ang, 0deg)) scaleX(0.05); opacity: 0; }
          28% { transform: translate(0, -50%) rotate(var(--ang, 0deg)) scaleX(1); opacity: 0.7; }
          100% { opacity: 0; }
        }
        @keyframes tracerImpact {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1); opacity: 0.75; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes battleFinisherDim {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {vfxNode && showHeavyEffects ? <div style={{ opacity: 0.62 * qualityMultiplier }}>{vfxNode}</div> : null}
      </div>

      <div style={{ position: 'relative', zIndex: 3, padding: `max(8px, ${mainInsets.top}px) ${density === 'desktop' ? 18 : density === 'tablet' ? 14 : 10}px 0`, boxSizing: 'border-box' }}>
        <div
          style={{
            maxWidth: '980px',
            margin: '0 auto 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(148,163,184,0.22)',
            background: 'rgba(2,6,23,0.46)',
            padding: '8px 10px',
            color: '#e2e8f0',
            fontSize: 'clamp(11px, 2.3vw, 13px)',
            fontWeight: 800,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cardBattle.opponent.name}
          </span>
          <span style={{ color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
            {cardBattle.round}/{maxRounds}
          </span>
        </div>

        <MonsterPanel
          title="Enemies"
          density={density}
          compact={compact}
          highContrast={highContrast}
          fighters={cardBattle.botTeam}
          selectedUid={cardBattle.selectedTargetUid}
          activeUid={cardBattle.activeFighterUid}
          side="enemy"
          onFighterRef={(uid, el) => {
            if (el) fighterCardRefs.current.set(uid, el);
            else fighterCardRefs.current.delete(uid);
          }}
          onSelect={onSelectTarget}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${mainInsets.bottom}px + ${density === 'desktop' ? '228px' : density === 'tablet' ? '206px' : '188px'})`,
          zIndex: 6,
          padding: `0 ${density === 'desktop' ? 18 : density === 'tablet' ? 14 : 10}px`,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <MonsterPanel
            title="Squad"
            density={density}
            compact={compact}
            highContrast={highContrast}
            fighters={cardBattle.playerTeam}
            selectedUid={cardBattle.selectedAllyUid}
            activeUid={cardBattle.activeFighterUid}
            side="player"
            onFighterRef={(uid, el) => {
              if (el) fighterCardRefs.current.set(uid, el);
              else fighterCardRefs.current.delete(uid);
            }}
            onSelect={onSelectAlly}
          />
        </div>
      </div>

      <TurnIndicator turn={cardBattle.turn} />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${mainInsets.bottom}px + ${density === 'desktop' ? 14 : 8}px)`,
          zIndex: 7,
          padding: `0 ${density === 'desktop' ? 18 : density === 'tablet' ? 14 : 10}px`,
        }}
      >
        <ActionPanel
          density={density}
          compact={compact}
          highContrast={highContrast}
          basicName={basicName}
          skillName={skillName}
          skillCooldown={skillCd}
          skillCooldownMax={skillMaxCd}
          ultTitle={ultTitle}
          ultReady={(cardBattle.heroUltCharges ?? 0) >= 4}
          auto={cardBattle.auto}
          canAct={canAct}
          autoSpeed={cardBattle.autoSpeed}
          autoSpeeds={autoSpeeds}
          onBasic={onBasic}
          onSkill={onSkill}
          onUlt={onUlt}
          onToggleAuto={onToggleAuto}
          onSetAutoSpeed={onSetAutoSpeed}
          onExit={onExit}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          right: density === 'desktop' ? '18px' : '10px',
          bottom: `calc(${mainInsets.bottom}px + ${density === 'desktop' ? '164px' : density === 'tablet' ? '152px' : '138px'})`,
          zIndex: 8,
        }}
      >
        <BattleLog
          events={cardBattle.log}
          maxItems={
            quality === 'low'
              ? 2
              : compact
                ? 2
                : density === 'mobile'
                  ? 3
                  : 5
          }
          density={density}
        />
      </div>

      {showHeavyEffects && cardBattle.lastAttack && renderTracer(cardBattle.lastAttack)}

      {cardBattle.pendingFinish && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9,
            pointerEvents: 'none',
            background:
              cardBattle.pendingFinish.result === 'win'
                ? `radial-gradient(circle at center, rgba(34,197,94,${0.2 * qualityMultiplier}), rgba(2,6,23,0.55))`
                : `radial-gradient(circle at center, rgba(239,68,68,${0.2 * qualityMultiplier}), rgba(2,6,23,0.55))`,
            animation: `battleFinisherDim ${finisherDelayMs}ms ease-out forwards`,
          }}
        />
      )}
    </BattleBackground>
  );
});
