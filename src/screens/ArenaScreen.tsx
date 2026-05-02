import { memo, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ARENA_RANKING_REWARDS, type ArenaRankingEntry, type ArenaRankingPeriod } from '../game/arenaConfig';
import { getPvpOpponentAvatarUrl } from '../zodiacAvatars';
import { Icon3D } from '../ui/Icon3D';
import type { PvpOpponentInfo, PvpRefreshMeta } from '../playerProgress';
import { getRatingLeague, getNextLeague, getLeagueProgressPct } from '../game/leagues';
import { Background } from '../components/ui/Background';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Button } from '../components/ui/Button';

export type ArenaSubScreen = 'main' | 'pve' | 'pvp' | 'ranking';

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

export type ArenaScreenProps = {
  background: string;
  contentInset: CSSProperties;
  arenaSubScreen: ArenaSubScreen;
  setArenaSubScreen: (s: ArenaSubScreen) => void;
  rating: number;
  playerId: string | null;
  userName: string;
  setPvpListRefreshKey: Dispatch<SetStateAction<number>>;
  pvpOpponentsLoading: boolean;
  pvpOpponentsError: boolean;
  pvpOpponents: PvpOpponentInfo[];
  pvpRefreshMeta: PvpRefreshMeta | null;
  pvpRefreshBusy: boolean;
  onPvpRefresh: () => void;
  onPvpBattle: (opp: PvpOpponentInfo) => void;
  materials: number;
  artifactCount: number;
  currentChapter: number;
  currentLevel: number;
  setCurrentChapter: (n: number) => void;
  setCurrentLevel: (n: number) => void;
  onStartTrainingPve: () => void;
  getRequiredHeroLevelForStage: (chapter: number, level: number) => number;
  canEnterPveStage: (chapter: number, level: number) => boolean;
  onStartPveStage: (chapter: number, level: number) => void;
  arenaRankingPeriod: ArenaRankingPeriod;
  setArenaRankingPeriod: (p: ArenaRankingPeriod) => void;
  arenaLeaderboardLoading: boolean;
  arenaLeaderboardError: boolean;
  arenaLeaderboardEntries: ArenaRankingEntry[];
};

export const ArenaScreen = memo(function ArenaScreen({
  background,
  contentInset,
  arenaSubScreen,
  setArenaSubScreen,
  rating,
  playerId,
  userName,
  setPvpListRefreshKey: _setPvpListRefreshKey,
  pvpOpponentsLoading,
  pvpOpponentsError,
  pvpOpponents,
  pvpRefreshMeta,
  pvpRefreshBusy,
  onPvpRefresh,
  onPvpBattle,
  materials,
  artifactCount,
  currentChapter,
  currentLevel,
  setCurrentChapter,
  setCurrentLevel,
  onStartTrainingPve,
  getRequiredHeroLevelForStage,
  canEnterPveStage,
  onStartPveStage,
  arenaRankingPeriod,
  setArenaRankingPeriod,
  arenaLeaderboardLoading,
  arenaLeaderboardError,
  arenaLeaderboardEntries,
}: ArenaScreenProps) {
  return (
    <Background
      background={background}
      gradient="linear-gradient(180deg, rgba(10,15,42,0.56) 0%, rgba(10,15,42,0.42) 100%)"
      style={{
        ...contentInset,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 12px' }}>
        <GlassCard style={{ marginBottom: '12px' }}>
          <SectionTitle title="Арена" subtitle="PvP, PvE, рейтинг лиги и подбор соперников" />
        </GlassCard>
      </div>
      {(() => {
        const playerLeague = getRatingLeague(rating);
        const myRow = arenaLeaderboardEntries.find(
          e => (playerId && e.playerId === playerId) || (!e.playerId && e.name === (userName.trim() || 'Ты')),
        );
        const myPlace = myRow?.place ?? null;
        type TileKind = 'pvp' | 'pve' | 'ranking';
        const tiles: Array<{
          key: TileKind;
          title: string;
          subtitle: string;
          accent: string;
          gradient: string;
          icon: ReactNode;
        }> = [
          {
            key: 'pvp',
            title: 'PvP Бои',
            subtitle: `Лига ${playerLeague.name} • ${rating} рейтинга`,
            accent: '#f59e0b',
            gradient: 'linear-gradient(135deg, rgba(120,53,15,0.92), rgba(2,6,23,0.95) 60%)',
            icon: <Icon3D id="pvp-3d" size={48} />,
          },
          {
            key: 'pve',
            title: 'PvE Походы',
            subtitle: `Глава ${currentChapter} • уровень ${currentLevel}`,
            accent: '#0ea5e9',
            gradient: 'linear-gradient(135deg, rgba(7,89,133,0.92), rgba(2,6,23,0.95) 60%)',
            icon: <Icon3D id="pve-3d" size={48} />,
          },
          {
            key: 'ranking',
            title: 'Рейтинг',
            subtitle: myPlace ? `Ты в топе: #${myPlace}` : 'Топ недели и месяца',
            accent: '#a855f7',
            gradient: 'linear-gradient(135deg, rgba(76,29,149,0.92), rgba(2,6,23,0.95) 60%)',
            icon: <span style={{ fontSize: '40px', lineHeight: 1, textShadow: '0 6px 14px rgba(168,85,247,0.5)' }}>🏆</span>,
          },
        ];
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '12px',
              marginTop: '12px',
              padding: '0 16px',
              width: '100%',
              maxWidth: '440px',
              marginLeft: 'auto',
              marginRight: 'auto',
              boxSizing: 'border-box',
            }}
          >
            {tiles.map(tile => {
              const active = arenaSubScreen === tile.key;
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => setArenaSubScreen(tile.key)}
                  style={{
                    position: 'relative',
                    padding: '14px 16px',
                    background: `linear-gradient(145deg, rgba(10,15,42,0.85), rgba(26,31,60,0.76)), ${tile.gradient}`,
                    color: '#fff',
                    border: `${active ? '2px' : '1px'} solid ${active ? tile.accent : `${tile.accent}88`}`,
                    borderRadius: '20px',
                    width: '100%',
                    minHeight: '88px',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center',
                    columnGap: '14px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    boxShadow: active
                      ? `0 0 0 1px ${tile.accent}, 0 12px 30px ${tile.accent}55, inset 0 0 32px ${tile.accent}22`
                      : `0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(79,212,255,0.18), inset 0 1px 0 rgba(255,255,255,0.05)`,
                    transform: active ? 'translateY(-1px)' : 'none',
                    transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
                    textAlign: 'left',
                  }}
                >
                  {/* мягкий световой ореол под иконкой */}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '-10px',
                      top: '-30%',
                      width: '160px',
                      height: '160%',
                      background: `radial-gradient(closest-side, ${tile.accent}55, transparent 70%)`,
                      pointerEvents: 'none',
                      opacity: active ? 0.95 : 0.55,
                      transition: 'opacity 0.18s ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      width: '60px',
                      height: '60px',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '16px',
                      background: 'rgba(2,6,23,0.55)',
                      border: `1px solid ${tile.accent}88`,
                      boxShadow: `0 6px 16px rgba(0,0,0,0.5)`,
                      flexShrink: 0,
                    }}
                  >
                    {tile.icon}
                  </div>
                  <div style={{ position: 'relative', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 950,
                        fontSize: 'clamp(16px, 4.4vw, 20px)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: '#fff',
                        textShadow: `0 0 14px ${tile.accent}66, 0 2px 6px rgba(0,0,0,0.85)`,
                      }}
                    >
                      {tile.title}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        color: '#cbd5e1',
                        fontSize: 'clamp(11px, 2.9vw, 13px)',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tile.subtitle}
                    </div>
                  </div>
                  <div
                    aria-hidden
                    style={{
                      position: 'relative',
                      width: '32px',
                      height: '32px',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '999px',
                      background: active ? tile.accent : 'rgba(2,6,23,0.65)',
                      color: active ? '#0b1120' : '#e2e8f0',
                      border: `1px solid ${tile.accent}`,
                      boxShadow: active ? `0 0 16px ${tile.accent}88` : 'none',
                      fontSize: '18px',
                      fontWeight: 950,
                      transition: 'background 0.18s ease, color 0.18s ease',
                    }}
                  >
                    ›
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}

      {arenaSubScreen === 'pvp' && (
        <div style={{ padding: '0 20px', marginTop: '30px' }}>
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '18px',
              background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.97) 0%, rgba(2, 6, 23, 0.94) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.4)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
              textAlign: 'left',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {(() => {
              const league = getRatingLeague(rating);
              const next = getNextLeague(rating);
              const pct = getLeagueProgressPct(rating);
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '14px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(2,6,23,0.75)',
                    border: `1px solid ${league.color}`,
                    boxShadow: `0 0 18px ${league.color}40`,
                  }}
                >
                  <div style={{ fontSize: '28px', lineHeight: 1 }} aria-hidden>{league.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <div style={{ color: league.color, fontWeight: 950, fontSize: 'clamp(13px, 3.5vw, 15px)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Лига {league.name}
                      </div>
                      <div style={{ color: '#fde047', fontWeight: 900, fontSize: 'clamp(13px, 3.5vw, 15px)' }}>{rating}</div>
                    </div>
                    <div style={{ marginTop: '6px', height: '6px', background: 'rgba(148,163,184,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: league.color, transition: 'width 240ms ease' }} />
                    </div>
                    <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>
                      {next
                        ? `До лиги ${next.name}: ${Math.max(0, next.minRating - rating)} рейтинга`
                        : 'Высшая лига достигнута'}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <p
                style={{
                  margin: 0,
                  flex: 1,
                  textAlign: 'left',
                  color: '#f1f5f9',
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  fontWeight: 600,
                  lineHeight: 1.45,
                  textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                Соперники по близости рейтинга. Подбор учитывает разницу рейтинга и стихию.
              </p>
              {(() => {
                const cost = pvpRefreshMeta?.nextCost ?? 0;
                const freeLeft = pvpRefreshMeta?.freeLeft;
                const free = cost === 0;
                const busy = pvpOpponentsLoading || pvpRefreshBusy;
                const disabled = busy || !playerId;
                const label = busy
                  ? '…'
                  : free
                    ? freeLeft != null
                      ? `Обновить · ${freeLeft}/${pvpRefreshMeta?.freePerDay ?? 5}`
                      : 'Обновить'
                    : `Обновить · 💎 ${cost}`;
                return (
                  <Button
                    onClick={onPvpRefresh}
                    disabled={disabled}
                    tone={free ? 'violet' : 'pink'}
                    title={
                      free
                        ? `Бесплатных обновлений сегодня осталось: ${freeLeft ?? '?'} из ${pvpRefreshMeta?.freePerDay ?? 5}.`
                        : `Сегодня бесплатные обновления закончились. Следующее: ${cost} кристаллов (каждое следующее дороже).`
                    }
                    style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </Button>
                );
              })()}
            </div>
            {!playerId && (
              <p
                style={{
                  color: '#e2e8f0',
                  fontSize: 'clamp(13px, 3.3vw, 15px)',
                  fontWeight: 600,
                  textAlign: 'left',
                  margin: 0,
                  lineHeight: 1.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                }}
              >
                Нужен игровой ID — дождись загрузки профиля.
              </p>
            )}
            {playerId && pvpOpponentsError && !pvpOpponentsLoading && (
              <p
                style={{
                  margin: 0,
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: 'rgba(127, 29, 29, 0.55)',
                  border: '1px solid rgba(252, 165, 165, 0.45)',
                  color: '#fee2e2',
                  fontSize: 'clamp(13px, 3.3vw, 15px)',
                  fontWeight: 600,
                  lineHeight: 1.45,
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                Не удалось загрузить список. Проверь сеть и backend.
              </p>
            )}
            {playerId && !pvpOpponentsLoading && !pvpOpponentsError && pvpOpponents.length === 0 && (
              <p
                style={{
                  color: '#e2e8f0',
                  fontSize: 'clamp(13px, 3.3vw, 15px)',
                  fontWeight: 600,
                  textAlign: 'left',
                  margin: 0,
                  lineHeight: 1.5,
                  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                }}
              >
                Пока нет других игроков в реестре с рейтингом — зайди позже.
              </p>
            )}
            {pvpOpponents.map(opp => (
              <div
                key={opp.playerId}
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  marginBottom: '12px',
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid rgba(100, 116, 139, 0.45)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <img
                    loading="lazy"
                    decoding="async"
                    src={getPvpOpponentAvatarUrl(opp)}
                    alt=""
                    width={44}
                    height={44}
                    style={{
                      flexShrink: 0,
                      width: 'clamp(36px, 10vw, 44px)',
                      height: 'clamp(36px, 10vw, 44px)',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(167, 139, 250, 0.55)',
                      boxShadow: '0 0 16px rgba(91, 33, 182, 0.45)',
                      background: '#0f172a',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        wordBreak: 'break-word',
                        color: '#f8fafc',
                        fontSize: 'clamp(15px, 3.4vw, 17px)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {opp.name || `Игрок #${opp.playerId}`}
                    </div>
                    <div
                      style={{
                        margin: '6px 0 0',
                        fontSize: 'clamp(12px, 3vw, 14px)',
                        fontWeight: 600,
                        color: '#cbd5e1',
                        lineHeight: 1.4,
                        textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                      }}
                    >
                      Рейтинг {opp.rating} · сила {opp.power} · HP {opp.maxHP}
                      {playerId && (
                        <span style={{ color: Math.abs(opp.rating - rating) < 1 ? '#86efac' : '#a5b4fc', fontWeight: 700 }}>
                          {' '}
                          (Δ{opp.rating - rating > 0 ? '+' : ''}
                          {opp.rating - rating})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => onPvpBattle(opp)}
                  tone="violet"
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 900,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 3,
                    pointerEvents: 'auto',
                  }}
                >
                  <Icon3D id="pvp-3d" size={30} /> БОЙ 3×3
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {arenaSubScreen === 'pve' && (
        <div style={{ padding: '0 20px', marginTop: '30px' }}>
          <h3 style={{ ...sectionTitleStyle('#0ea5e9'), fontSize: 'clamp(22px, 4vw, 30px)' }}>🚀 ПОХОДЫ ПО ГАЛАКТИКЕ</h3>
          <p style={{ ...metaTextStyle, marginBottom: '20px' }}>
            Материалы: {materials} | Артефакты: {artifactCount} | Выбрано: Глава {currentChapter}, Уровень {currentLevel}
          </p>
          <div
            style={{
              marginBottom: '22px',
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(6, 95, 70, 0.5), rgba(15, 23, 42, 0.95))',
              border: '1px solid #2dd4bf',
              textAlign: 'left',
            }}
          >
            <div style={{ ...cardTitleStyle('#5eead4'), marginBottom: '8px', fontSize: 'clamp(16px, 3.5vw, 20px)' }}>🎓 Обучающий PvE 3×3</div>
            <p style={{ ...metaTextStyle, margin: '0 0 12px' }}>
              Один слабый вражеский отряд: ручная тренировка механики. Награда небольшая, прогресс по главам <b style={{ color: '#a5b4fc' }}>не сдвигается</b>.
            </p>
            <button
              type="button"
              onClick={onStartTrainingPve}
              disabled={!playerId}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontWeight: 950,
                fontSize: 'clamp(14px, 3.4vw, 16px)',
                color: '#042f2e',
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                background: 'linear-gradient(180deg, #5eead4, #14b8a6)',
                boxShadow: '0 6px 20px rgba(20, 184, 166, 0.35)',
                position: 'relative',
                zIndex: 3,
                pointerEvents: 'auto',
                opacity: playerId ? 1 : 0.6,
              }}
            >
              {playerId ? 'Старт обучения' : 'Ожидаем игровой ID...'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 56px), 1fr))', gap: '8px' }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(ch => (
              <div
                key={ch}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setCurrentChapter(ch);
                    setCurrentLevel(1);
                  }
                }}
                onClick={() => {
                  setCurrentChapter(ch);
                  setCurrentLevel(1);
                }}
                style={{
                  background: currentChapter === ch ? '#0ea5e9' : '#1e2937',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: currentChapter === ch ? '2px solid #60a5fa' : '1px solid #475569',
                  fontWeight: 'bold',
                  fontSize: 'clamp(11px, 3.2vw, 14px)',
                  textAlign: 'center',
                }}
              >
                Гл. {ch}
              </div>
            ))}
          </div>

          {currentChapter > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h4 style={{ color: '#0ea5e9' }}>Глава {currentChapter} - Выбери уровень</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '16px' }}>
                {Array.from({ length: 6 }, (_, i) => i + 1).map(lvl => {
                  const requiredLevel = getRequiredHeroLevelForStage(currentChapter, lvl);
                  const locked = !playerId || !canEnterPveStage(currentChapter, lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setCurrentLevel(lvl);
                        onStartPveStage(currentChapter, lvl);
                      }}
                      disabled={locked}
                      style={{
                        padding: '12px 8px',
                        minWidth: 0,
                        background: locked ? '#111827' : lvl === 6 ? '#7c3aed' : '#1e2937',
                        color: locked ? '#64748b' : '#fff',
                        border: '2px solid ' + (locked ? '#334155' : lvl === 6 ? '#c084fc' : '#0ea5e9'),
                        borderRadius: '12px',
                        cursor: locked ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: 'clamp(12px, 3.2vw, 16px)',
                        opacity: locked ? 0.75 : 1,
                        boxSizing: 'border-box',
                        position: 'relative',
                        zIndex: 2,
                        pointerEvents: locked ? 'none' : 'auto',
                      }}
                    >
                      <div style={{ lineHeight: 1.2 }}>{lvl === 6 ? `👹 БОСС` : `${lvl} ур.`}</div>
                      <div style={{ marginTop: '6px', fontSize: '10px', color: locked ? '#94a3b8' : '#bae6fd', lineHeight: 1.2 }}>
                        Требуется Lv. {requiredLevel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {arenaSubScreen === 'ranking' && (
        <div style={{ padding: '0 16px', margin: '30px auto 0', maxWidth: '980px' }}>
          <h3 style={{ ...sectionTitleStyle('#facc15'), fontSize: 'clamp(22px, 4vw, 30px)' }}>🏆 РЕЙТИНГ АРЕНЫ</h3>
          <p style={{ ...metaTextStyle, marginBottom: '18px' }}>
            Соревнуйся в PVP за недельные и месячные призы. Твой текущий рейтинг: <b style={{ color: '#a5b4fc' }}>{rating}</b>. Таблица ниже — <b>реальные тестеры</b> с сервера (ник и прогресс из сохранённых профилей).
            {arenaLeaderboardLoading && <> Загрузка…</>}
            {arenaLeaderboardError && !arenaLeaderboardLoading && (
              <>
                {' '}
                <span style={{ color: '#f97316' }}>Список с сервера недоступен — показан только твой локальный результат.</span>
              </>
            )}
          </p>

          <div style={{ display: 'inline-flex', background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', borderRadius: '999px', padding: '5px', marginBottom: '18px' }}>
            {(['week', 'month'] as const).map(period => (
              <button
                key={period}
                type="button"
                onClick={() => setArenaRankingPeriod(period)}
                style={{ padding: '10px 18px', borderRadius: '999px', border: 'none', background: arenaRankingPeriod === period ? '#f59e0b' : 'transparent', color: arenaRankingPeriod === period ? '#111827' : '#cbd5e1', fontWeight: 950, cursor: 'pointer' }}
              >
                {period === 'week' ? 'За неделю' : 'За месяц'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px', alignItems: 'start' }}>
            <section style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #475569', borderRadius: '20px', padding: '14px', textAlign: 'left', minWidth: 0 }}>
              <div style={{ ...cardTitleStyle('#e2e8f0'), marginBottom: '12px' }}>Таблица лидеров</div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {arenaLeaderboardLoading && arenaLeaderboardEntries.length === 0 ? (
                  <div style={{ ...mutedTextStyle, fontSize: '13px', padding: '8px 0' }}>Загрузка таблицы…</div>
                ) : arenaLeaderboardEntries.length === 0 ? (
                  <div style={{ ...mutedTextStyle, fontSize: '13px', padding: '8px 0' }}>
                    В сохранённых профилях на сервере пока никого нет — зайди в игру и дождись сохранения прогресса, или проверь, что клиент ходит на тот же API.
                  </div>
                ) : (
                  arenaLeaderboardEntries.map(entry => {
                    const isPlayer =
                      Boolean(playerId && entry.playerId === playerId) || (!entry.playerId && entry.name === (userName.trim() || 'Ты'));
                    const medal = entry.place === 1 ? '🥇' : entry.place === 2 ? '🥈' : entry.place === 3 ? '🥉' : `#${entry.place}`;
                    return (
                      <div
                        key={entry.playerId ? `pid-${entry.playerId}` : `row-${entry.place}-${entry.name}`}
                        style={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) auto', gap: '8px', alignItems: 'center', padding: '10px', borderRadius: '14px', background: isPlayer ? 'rgba(234,179,8,0.16)' : '#0b1220', border: `1px solid ${isPlayer ? '#eab308' : '#334155'}` }}
                      >
                        <div style={{ fontWeight: 950, color: entry.place <= 3 ? '#facc15' : '#94a3b8' }}>{medal}</div>
                        <div>
                          <div style={{ color: isPlayer ? '#facc15' : '#e2e8f0', fontWeight: 950 }}>{isPlayer ? `${entry.name} (ты)` : entry.name}</div>
                          <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '2px' }}>{entry.wins} побед</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#a5b4fc', fontWeight: 950 }}>{entry.score}</div>
                          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 900 }}>очков</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #f59e0b', borderRadius: '20px', padding: '14px', textAlign: 'left' }}>
              <div style={{ ...cardTitleStyle('#facc15'), marginBottom: '12px' }}>
                Награды {arenaRankingPeriod === 'week' ? 'недели' : 'месяца'}
              </div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {ARENA_RANKING_REWARDS[arenaRankingPeriod].map(reward => (
                  <div key={reward.place} style={{ background: '#0b1220', border: `1px solid ${reward.accent}`, borderRadius: '14px', padding: '12px' }}>
                    <div style={cardTitleStyle(reward.accent)}>{reward.place}</div>
                    <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '5px' }}>{reward.reward}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '12px' }}>Награды выдаются после окончания периода. Рейтинг растёт за победы в PVP 3×3.</div>
            </section>
          </div>
        </div>
      )}
    </Background>
  );
});
