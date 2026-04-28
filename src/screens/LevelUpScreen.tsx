import type { CSSProperties } from 'react';
import type { SquadHero } from '../game/battle';
import { getHeroXpToNextLevel, HERO_STAT_POINTS_PER_LEVEL } from '../game/heroProgress';
import { Icon3D } from '../ui/Icon3D';

const sectionTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  margin: '0 0 22px',
  fontSize: 'clamp(28px, 5vw, 42px)',
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: '0.055em',
  textTransform: 'uppercase',
  textShadow: `0 0 18px ${color}66, 0 4px 14px rgba(0,0,0,0.85)`,
});

const heroNameStyle: CSSProperties = {
  color: '#facc15',
  margin: '0 0 8px',
  fontSize: 'clamp(22px, 4vw, 30px)',
  fontWeight: 950,
  letterSpacing: '0.035em',
  textShadow: '0 0 18px rgba(234,179,8,0.7), 0 3px 10px rgba(0,0,0,0.85)',
};

const metaTextStyle: CSSProperties = {
  color: '#c4b5fd',
  fontSize: '14px',
  fontWeight: 750,
  letterSpacing: '0.025em',
  textShadow: '0 2px 10px rgba(0,0,0,0.85)',
};

const cardTitleStyle = (color = '#eab308'): CSSProperties => ({
  color,
  fontWeight: 950,
  letterSpacing: '0.035em',
  textTransform: 'uppercase',
  textShadow: `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.75)`,
});

const mutedTextStyle: CSSProperties = {
  color: '#cbd5e1',
  fontWeight: 650,
  letterSpacing: '0.015em',
  lineHeight: 1.35,
};

export type LevelUpScreenProps = {
  background: string;
  contentInset: CSSProperties;
  mainHero: SquadHero;
  onLevelUp: (type: 'power' | 'stars') => void;
  coins: number;
  crystals: number;
};

export function LevelUpScreen({ background, contentInset, mainHero, onLevelUp, coins, crystals }: LevelUpScreenProps) {
  const xpNeed = getHeroXpToNextLevel(mainHero.level);
  const xpCur = Math.max(0, mainHero.exp);
  const xpPct = Math.min(100, (xpCur / Math.max(1, xpNeed)) * 100);
  const sp = mainHero.statPoints ?? 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url('${background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...contentInset,
        textAlign: 'center',
        boxSizing: 'border-box',
        paddingLeft: '12px',
        paddingRight: '12px',
      }}
    >
      <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>📈 ПРОКАЧКА</h2>

      <div style={{ margin: '24px auto', maxWidth: '360px', width: '100%', boxSizing: 'border-box' }}>
        <img src={mainHero.image} style={{ width: '100%', borderRadius: '16px', marginBottom: '20px' }} alt="" />
        <h3 style={heroNameStyle}>{mainHero.name}</h3>
        <p style={metaTextStyle}>
          Lv. {mainHero.level} • ★{mainHero.stars}
        </p>
        <div
          style={{
            background: '#1e2937',
            padding: '14px 16px',
            borderRadius: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(148,163,184,0.35)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 800, marginBottom: '6px' }}>Опыт героя</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ color: '#e2e8f0', fontSize: 'clamp(15px, 3.5vw, 18px)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {xpCur} / {xpNeed} XP
            </span>
            <span style={{ color: '#a5b4fc', fontSize: '12px' }}>след. ур.</span>
          </div>
          <div
            style={{
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(30,41,59,0.95)',
              border: '1px solid #334155',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${xpPct}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #3b82f6, #a5b4fc)',
                transition: 'width 0.25s ease-out',
              }}
            />
          </div>
          <p style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '10px', marginBottom: 0, lineHeight: 1.4 }}>
            Опыт начисляется за бои (PVE / PvP / тренировку). Уровень растёт только за опыт. За каждый новый уровень —{' '}
            <b style={{ color: '#facc15' }}>+{HERO_STAT_POINTS_PER_LEVEL}</b> оч. прокачки.
          </p>
        </div>
        <div style={{ background: '#1e2937', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>⚡ Сила: {mainHero.basePower}</div>
          <div style={{ color: '#94a3b8', marginTop: '8px' }}>HP: {mainHero.basePower * 10}</div>
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30,27,75,0.6), rgba(15,23,42,0.95))',
            padding: '12px 14px',
            borderRadius: '14px',
            marginBottom: '20px',
            border: '1px solid rgba(250,204,21,0.35)',
            fontSize: 'clamp(16px, 3.5vw, 20px)',
            fontWeight: 900,
            color: '#fde68a',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          🎯 Очки прокачки: <span style={{ color: '#facc15' }}>{sp}</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: '15px',
          padding: '0',
          maxWidth: '360px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ background: '#1e2937', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '16px', border: '2px solid #f59e0b', boxSizing: 'border-box' }}>
          <div style={{ ...cardTitleStyle('#f59e0b'), fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '12px' }}>⚡ Повысить силу</div>
          <div style={{ ...mutedTextStyle, marginBottom: '12px' }}>+5 к силе — <b style={{ color: '#facc15' }}>1 очко прокачки</b></div>
          <button
            type="button"
            onClick={() => onLevelUp('power')}
            disabled={sp < 1}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: sp < 1 ? '#475569' : '#f59e0b',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: sp < 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon3D id="levelup-3d" size={30} /> Прокачать
          </button>
        </div>

        <div style={{ background: '#1e2937', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '16px', border: '2px solid #ec4899', boxSizing: 'border-box' }}>
          <div style={{ ...cardTitleStyle('#ec4899'), fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '12px' }}>⭐ Повысить редкость (звёзды)</div>
          <div style={{ ...mutedTextStyle, marginBottom: '12px' }}>
            +1 звезда {mainHero.stars < 6 ? `(${mainHero.stars}/6)` : '(макс)'} | Стоимость: 120 кристаллов
          </div>
          <button
            type="button"
            onClick={() => onLevelUp('stars')}
            disabled={mainHero.stars >= 6}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: mainHero.stars >= 6 ? '#475569' : '#ec4899',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: mainHero.stars >= 6 ? 'not-allowed' : 'pointer',
              opacity: mainHero.stars >= 6 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Icon3D id="levelup-3d" size={30} /> {mainHero.stars >= 6 ? 'Максимум' : 'Прокачать'}
          </button>
        </div>
      </div>

      <div style={{ ...metaTextStyle, marginTop: '40px', fontSize: '18px' }}>
        Монеты: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{coins}</span> • Кристаллы:{' '}
        <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{crystals}</span>
      </div>
    </div>
  );
}
