import type { CSSProperties } from 'react';
import type { SquadHero } from '../game/battle';
import { getHeroXpToNextLevel, HERO_STAT_POINTS_PER_LEVEL } from '../game/heroProgress';
import { getHeroUltPattern, getHeroUltPower, getHeroUltimateTitle } from '../game/heroUltimate';
import { CARD_STAR_MAX, CARD_STAR_UP_COST } from '../cards/acquisition';
import { CHARACTER_CARDS } from '../cards/catalog';
import { getCharacterCardImageSrcSet, getCharacterCardImageUrl } from '../cards/images';
import { getRarityFrameUrl } from '../ui/rarityFrames';
import { Icon3D } from '../ui/Icon3D';

const ULT_PATTERN_DESCRIPTION: Record<ReturnType<typeof getHeroUltPattern>, string> = {
  fire_aoe: 'Урон по всем врагам в карточном бою. Заряд: 4 хода твоей карты.',
  earth_shield: 'Щит всем твоим бойцам. Заряд: 4 хода твоей карты.',
  air_heal: 'Лечение всех твоих бойцов. Заряд: 4 хода твоей карты.',
  water_burst: 'Тяжёлый удар по выбранной цели + периодический урон. Заряд: 4 хода твоей карты.',
};

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
  /** id карт активного отряда (3 шт.) */
  cardSquadIds: string[];
  /** Сколько копий каждой карты в коллекции (включая «носимую») */
  collection: Record<string, number>;
  /** Звёзды каждой карты (1..5) */
  cardStars: Record<string, number>;
  /** Открыть модальное окно прокачки карты */
  onOpenCardUpgrade: (cardId: string) => void;
};

export function LevelUpScreen({
  background,
  contentInset,
  mainHero,
  onLevelUp,
  coins,
  crystals,
  cardSquadIds,
  collection,
  cardStars,
  onOpenCardUpgrade,
}: LevelUpScreenProps) {
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
        <img loading="lazy" decoding="async" src={mainHero.image} style={{ width: 'clamp(180px, 58vw, 320px)', maxWidth: '100%', height: 'auto', borderRadius: '16px', marginBottom: '20px' }} alt="" />
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
        {(() => {
          const pattern = getHeroUltPattern(mainHero.id);
          const ultPower = getHeroUltPower(mainHero);
          return (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(56,189,248,0.15))',
                padding: '14px 16px',
                borderRadius: '16px',
                marginBottom: '20px',
                border: '1px solid rgba(234,179,8,0.55)',
              }}
            >
              <div style={{ ...cardTitleStyle('#facc15'), fontSize: 'clamp(14px, 3.6vw, 18px)', marginBottom: '6px' }}>
                ⭐ Ультимейт героя — {getHeroUltimateTitle(pattern)}
              </div>
              <div style={{ ...mutedTextStyle, fontSize: 'clamp(11px, 3vw, 13px)' }}>
                {ULT_PATTERN_DESCRIPTION[pattern]}
              </div>
              <div style={{ ...mutedTextStyle, fontSize: 'clamp(10px, 2.6vw, 12px)', marginTop: '6px', color: '#94a3b8' }}>
                Сила ульты: <b style={{ color: '#facc15' }}>{ultPower}</b> (растёт с уровнем и звёздами).
              </div>
            </div>
          );
        })()}
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

      <div
        style={{
          marginTop: '32px',
          maxWidth: '420px',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(76,29,149,0.4))',
          border: '1px solid rgba(250,204,21,0.45)',
          borderRadius: '18px',
          padding: '14px 14px 12px',
          boxSizing: 'border-box',
          textAlign: 'left',
        }}
      >
        <div style={{ ...cardTitleStyle('#facc15'), fontSize: 'clamp(14px, 3.6vw, 17px)', marginBottom: '10px', textAlign: 'center' }}>
          ⭐ Прокачка карт отряда
        </div>
        {cardSquadIds.length === 0 ? (
          <div style={{ ...mutedTextStyle, fontSize: '12px', textAlign: 'center' }}>
            Сначала выбери карты в отряд (вкладка «Карты»).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cardSquadIds.map(cardId => {
              const card = CHARACTER_CARDS.find(c => c.id === cardId);
              if (!card) return null;
              const owned = Math.max(0, Math.floor(Number(collection[cardId]) || 0));
              const stars = Math.max(1, Math.min(CARD_STAR_MAX, Math.floor(Number(cardStars[cardId]) || 1)));
              const atMax = stars >= CARD_STAR_MAX;
              const need = 1 + CARD_STAR_UP_COST;
              const sacrificeAvail = Math.max(0, owned - 1);
              const pct = atMax ? 100 : Math.min(100, Math.round((sacrificeAvail / CARD_STAR_UP_COST) * 100));
              const ready = !atMax && owned >= need;
              return (
                <button
                  key={cardId}
                  type="button"
                  onClick={() => onOpenCardUpgrade(cardId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    borderRadius: '14px',
                    border: ready ? '1px solid #facc15' : '1px solid #334155',
                    background: ready ? 'rgba(250,204,21,0.10)' : '#0b1220',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: ready ? '0 6px 16px rgba(250,204,21,0.15)' : 'none',
                  }}
                >
                  <div style={{ position: 'relative', width: '52px', height: '52px', flex: '0 0 52px' }}>
                    <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(cardId)} srcSet={getCharacterCardImageSrcSet(cardId)} style={{ position: 'absolute', inset: 0, width: 'clamp(46px, 13vw, 52px)', height: 'clamp(46px, 13vw, 52px)', borderRadius: '12px', objectFit: 'cover' }} alt="" />
                    <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: 'clamp(46px, 13vw, 52px)', height: 'clamp(46px, 13vw, 52px)' }} alt="" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 900, letterSpacing: '0.05em' }}>
                      {'★'.repeat(stars)}{'☆'.repeat(CARD_STAR_MAX - stars)}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        height: '6px',
                        borderRadius: '999px',
                        background: 'rgba(30,41,59,0.95)',
                        border: '1px solid #334155',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: atMax
                            ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                            : ready
                              ? 'linear-gradient(90deg, #facc15, #f97316)'
                              : 'linear-gradient(90deg, #475569, #94a3b8)',
                          transition: 'width 0.25s ease-out',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '10px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {atMax
                        ? 'Максимум звёзд'
                        : `${Math.min(CARD_STAR_UP_COST, sacrificeAvail)}/${CARD_STAR_UP_COST} копий до ★${stars + 1} (всего ${owned}, нужно ${need})`}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: '0 0 auto',
                      fontSize: '10px',
                      fontWeight: 950,
                      color: ready ? '#0b1120' : '#94a3b8',
                      background: ready ? 'linear-gradient(135deg,#facc15,#f97316)' : 'transparent',
                      border: ready ? 'none' : '1px solid #334155',
                      borderRadius: '999px',
                      padding: '4px 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {atMax ? '★ MAX' : ready ? '★ ГОТОВО' : '★ Прокачать'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ ...metaTextStyle, marginTop: '24px', fontSize: '18px' }}>
        Монеты: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{coins}</span> • Кристаллы:{' '}
        <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{crystals}</span>
      </div>
    </div>
  );
}
