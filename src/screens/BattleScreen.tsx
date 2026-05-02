import { memo, type CSSProperties, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { BattleTopBar } from '../components/battle/BattleTopBar';
import { BattleMonsterPanel } from '../components/battle/BattleMonsterPanel';
import { BattleActions } from '../components/battle/BattleActions';
import { BattleLog } from '../components/battle/BattleLog';

type BattleScreenProps = {
  cardBattle: any;
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
  const active = cardBattle.playerTeam.find((x: any) => x.uid === cardBattle.activeFighterUid && x.hp > 0);
  const basicName = active?.abilities.basic.name ?? 'Удар';
  const skillName = active?.abilities.skill.name ?? 'Навык';
  const skillCd = active?.cooldowns.skill ?? 0;
  const skillMaxCd = active?.abilities.skill.cooldownTurns ?? 1;
  const canAct = cardBattle.turn === 'player' && !cardBattle.auto && Boolean(active);

  return (
    <div
      ref={battleArenaRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        boxSizing: 'border-box',
        backgroundImage: `linear-gradient(180deg, rgba(7,10,22,0.65) 0%, rgba(7,10,22,0.9) 100%), url('/images/backgrounds/arena-bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...mainScrollPadding,
      }}
    >
      {vfxNode}
      <style>{`
        @keyframes tracerLine {
          0% { transform: translate(0, -50%) rotate(var(--ang, 0deg)) scaleX(0.05); opacity: 0; }
          28% { transform: translate(0, -50%) rotate(var(--ang, 0deg)) scaleX(1); opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes tracerImpact {
          0% { transform: scale(0.4); opacity: 0; }
          30% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes finisherBannerIn {
          0% { opacity: 0; transform: translateY(-18px) scale(0.94); }
          30% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0.85; transform: scale(1.04); }
        }
      `}</style>

      <BattleTopBar
        opponentName={cardBattle.opponent.name}
        round={cardBattle.round}
        maxRounds={maxRounds}
        rating={cardBattle.mode === 'pvp' ? cardBattle.opponent.power : undefined}
        elementIcon={cardBattle.botTeam[0]?.element ?? cardBattle.opponent.emoji ?? '⚔️'}
        onExit={onExit}
      />

      {cardBattle.isTrainingPve && (
        <div style={{ padding: '8px 12px', color: '#bbf7d0', fontSize: '12px' }}>
          Учебный бой: выбери цель в панели врага, затем используй способности снизу.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', padding: '8px 12px 10px' }}>
        <BattleMonsterPanel
          title="Враг"
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

        <div style={{ minHeight: '90px' }} />

        <BattleMonsterPanel
          title="Твой отряд"
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

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: `calc(${mainInsets.bottom}px + 10px)`, zIndex: 72, padding: '0 10px' }}>
        <BattleActions
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
          onSkip={onExit}
        />
      </div>

      <div style={{ position: 'fixed', right: '10px', bottom: `calc(${mainInsets.bottom}px + 172px)`, zIndex: 71 }}>
        <BattleLog events={cardBattle.log} maxItems={4} />
      </div>

      {cardBattle.lastAttack && renderTracer(cardBattle.lastAttack)}

      {cardBattle.pendingFinish && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            display: 'grid',
            placeItems: 'center',
            background:
              cardBattle.pendingFinish.result === 'win'
                ? 'radial-gradient(circle at center, rgba(34,197,94,0.32), rgba(2,6,23,0.78))'
                : 'radial-gradient(circle at center, rgba(239,68,68,0.32), rgba(2,6,23,0.78))',
            pointerEvents: 'none',
            animation: `finisherBannerIn ${finisherDelayMs}ms ease-out forwards`,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              fontWeight: 950,
              color: '#fff',
              textShadow: '0 0 24px rgba(0,0,0,0.85), 0 8px 28px rgba(0,0,0,0.95)',
            }}
          >
            <div style={{ fontSize: 'clamp(54px, 14vw, 112px)', lineHeight: 1 }}>
              {cardBattle.pendingFinish.result === 'win' ? '🏆' : '💀'}
            </div>
            <div style={{ marginTop: '14px', fontSize: 'clamp(22px, 6vw, 46px)' }}>
              {cardBattle.pendingFinish.result === 'win' ? 'Победа отряда' : 'Отряд повержен'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
