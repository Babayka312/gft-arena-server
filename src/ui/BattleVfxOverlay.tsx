import type { CSSProperties } from 'react';
import type { CardAbility } from '../cards/catalog';

export type BattleVfx = {
  id: number;
  kind: CardAbility['kind'];
  title: string;
  attackerName: string;
  targetName?: string;
  side: 'player' | 'bot';
  videoSrc?: string;
};

const palette: Record<CardAbility['kind'], { main: string; accent: string; glow: string; icon: string }> = {
  damage: { main: '#fb923c', accent: '#ef4444', glow: 'rgba(249,115,22,0.7)', icon: '⚔️' },
  heal: { main: '#4ade80', accent: '#bef264', glow: 'rgba(34,197,94,0.7)', icon: '✚' },
  shield: { main: '#38bdf8', accent: '#a5b4fc', glow: 'rgba(56,189,248,0.7)', icon: '🛡️' },
  dot: { main: '#a855f7', accent: '#22c55e', glow: 'rgba(168,85,247,0.7)', icon: '☠️' },
  stun: { main: '#facc15', accent: '#60a5fa', glow: 'rgba(250,204,21,0.7)', icon: '💫' },
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  pointerEvents: 'none',
  display: 'grid',
  placeItems: 'center',
  background: 'radial-gradient(circle at center, rgba(15,23,42,0.18), rgba(2,6,23,0.72))',
  overflow: 'hidden',
};

const titleStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  color: '#fff',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 950,
  textShadow: '0 0 20px rgba(255,255,255,0.45), 0 8px 24px rgba(0,0,0,0.9)',
};

export function BattleVfxOverlay({ effect }: { effect: BattleVfx }) {
  const colors = palette[effect.kind];
  const direction = effect.side === 'player' ? 'vfx-sweep-player' : 'vfx-sweep-bot';

  return (
    <div style={overlayStyle}>
      <style>
        {`
          @keyframes vfx-pulse-core {
            0% { transform: scale(0.55) rotate(0deg); opacity: 0; filter: blur(8px); }
            22% { opacity: 1; filter: blur(0); }
            72% { opacity: 0.9; }
            100% { transform: scale(1.45) rotate(12deg); opacity: 0; filter: blur(18px); }
          }
          @keyframes vfx-ring {
            0% { transform: scale(0.35); opacity: 0; }
            25% { opacity: 1; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          @keyframes vfx-sweep-player {
            0% { transform: translateX(-48vw) skewX(-16deg); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translateX(48vw) skewX(-16deg); opacity: 0; }
          }
          @keyframes vfx-sweep-bot {
            0% { transform: translateX(48vw) skewX(16deg); opacity: 0; }
            30% { opacity: 1; }
            100% { transform: translateX(-48vw) skewX(16deg); opacity: 0; }
          }
          @keyframes vfx-title {
            0% { transform: translateY(18px) scale(0.92); opacity: 0; }
            28% { transform: translateY(0) scale(1); opacity: 1; }
            82% { opacity: 1; }
            100% { transform: translateY(-12px) scale(1.04); opacity: 0; }
          }
          @keyframes vfx-spark {
            0% { transform: rotate(var(--angle)) translateX(12px) scale(0.2); opacity: 0; }
            24% { opacity: 1; }
            100% { transform: rotate(var(--angle)) translateX(210px) scale(1); opacity: 0; }
          }
        `}
      </style>

      {effect.videoSrc && (
        <video
          src={effect.videoSrc}
          autoPlay
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.78 }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          width: '42vw',
          maxWidth: '520px',
          minWidth: '280px',
          height: '160vh',
          background: `linear-gradient(90deg, transparent, ${colors.main}, ${colors.accent}, transparent)`,
          boxShadow: `0 0 80px ${colors.glow}`,
          opacity: 0.8,
          animation: `${direction} 920ms ease-out both`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '280px',
          height: '280px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${colors.main}, ${colors.glow} 46%, transparent 70%)`,
          boxShadow: `0 0 90px ${colors.glow}`,
          animation: 'vfx-pulse-core 920ms ease-out both',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '220px',
          height: '220px',
          borderRadius: '9999px',
          border: `4px solid ${colors.accent}`,
          boxShadow: `0 0 40px ${colors.glow}`,
          animation: 'vfx-ring 920ms ease-out both',
        }}
      />

      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={index}
          style={{
            '--angle': `${index * 25.7}deg`,
            position: 'absolute',
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            background: index % 2 === 0 ? colors.main : colors.accent,
            boxShadow: `0 0 18px ${colors.glow}`,
            animation: `vfx-spark 820ms ease-out ${index * 18}ms both`,
          } as CSSProperties}
        />
      ))}

      <div style={{ ...titleStyle, animation: 'vfx-title 980ms ease-out both' }}>
        <div style={{ fontSize: 'clamp(54px, 12vw, 112px)', lineHeight: 0.95 }}>{colors.icon}</div>
        <div style={{ marginTop: '12px', fontSize: 'clamp(22px, 5vw, 46px)' }}>{effect.title}</div>
        <div style={{ marginTop: '8px', fontSize: 'clamp(12px, 2.5vw, 16px)', color: '#cbd5e1', letterSpacing: '0.08em' }}>
          {effect.attackerName}
          {effect.targetName ? ` → ${effect.targetName}` : ''}
        </div>
      </div>
    </div>
  );
}
