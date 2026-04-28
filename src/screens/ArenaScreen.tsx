import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { ARENA_RANKING_REWARDS, type ArenaRankingEntry, type ArenaRankingPeriod } from '../game/arenaConfig';
import { getPvpOpponentAvatarUrl } from '../zodiacAvatars';
import { Icon3D } from '../ui/Icon3D';
import type { PvpOpponentInfo } from '../playerProgress';

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

export function ArenaScreen({
  background,
  contentInset,
  arenaSubScreen,
  setArenaSubScreen,
  rating,
  playerId,
  userName,
  setPvpListRefreshKey,
  pvpOpponentsLoading,
  pvpOpponentsError,
  pvpOpponents,
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
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url('${background}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        ...contentInset,
        textAlign: 'center',
      }}
    >
      <h2 style={{ ...sectionTitleStyle(), marginTop: 0, marginBottom: '8px', fontSize: 'clamp(22px, 5vw, 32px)' }}>⚔️ АРЕНА</h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          marginTop: '12px',
          padding: '0 16px',
          width: '100%',
          maxWidth: '420px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <button
          type="button"
          onClick={() => setArenaSubScreen('pvp')}
          style={{
            padding: '12px 14px',
            background: 'rgba(30,41,59,0.88)',
            color: '#fff',
            border: arenaSubScreen === 'pvp' ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.55)',
            borderRadius: '14px',
            fontSize: 'clamp(13px, 3.4vw, 17px)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: 900,
            cursor: 'pointer',
            boxSizing: 'border-box',
            boxShadow:
              arenaSubScreen === 'pvp'
                ? '0 0 0 1px #f59e0b, 0 0 22px rgba(245, 158, 11, 0.45), inset 0 0 22px rgba(245, 158, 11, 0.18)'
                : '0 8px 20px rgba(0,0,0,0.22)',
            transform: arenaSubScreen === 'pvp' ? 'translateY(-1px)' : 'none',
            transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
          }}
        >
          <Icon3D id="pvp-3d" size={32} /> PVP Бои
        </button>
        <button
          type="button"
          onClick={() => setArenaSubScreen('pve')}
          style={{
            padding: '12px 14px',
            background: 'rgba(30,41,59,0.88)',
            color: '#fff',
            border: arenaSubScreen === 'pve' ? '2px solid #0ea5e9' : '1px solid rgba(14, 165, 233, 0.55)',
            borderRadius: '14px',
            fontSize: 'clamp(13px, 3.4vw, 17px)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: 900,
            cursor: 'pointer',
            boxSizing: 'border-box',
            boxShadow:
              arenaSubScreen === 'pve'
                ? '0 0 0 1px #0ea5e9, 0 0 22px rgba(14, 165, 233, 0.45), inset 0 0 22px rgba(14, 165, 233, 0.18)'
                : '0 8px 20px rgba(0,0,0,0.22)',
            transform: arenaSubScreen === 'pve' ? 'translateY(-1px)' : 'none',
            transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
          }}
        >
          <Icon3D id="pve-3d" size={32} /> PVE Походы
        </button>
        <button
          type="button"
          onClick={() => setArenaSubScreen('ranking')}
          style={{
            padding: '12px 14px',
            background: 'rgba(30,41,59,0.88)',
            color: '#fff',
            border: arenaSubScreen === 'ranking' ? '2px solid #a855f7' : '1px solid rgba(168, 85, 247, 0.55)',
            borderRadius: '14px',
            fontSize: 'clamp(13px, 3.4vw, 17px)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: 900,
            cursor: 'pointer',
            boxSizing: 'border-box',
            boxShadow:
              arenaSubScreen === 'ranking'
                ? '0 0 0 1px #a855f7, 0 0 22px rgba(168, 85, 247, 0.45), inset 0 0 22px rgba(168, 85, 247, 0.18)'
                : '0 8px 20px rgba(0,0,0,0.22)',
            transform: arenaSubScreen === 'ranking' ? 'translateY(-1px)' : 'none',
            transition: 'box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease',
          }}
        >
          🏆 Рейтинг
        </button>
      </div>

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
                Соперники по близости рейтинга. Твой рейтинг: <b style={{ color: '#fde047', fontWeight: 800 }}>{rating}</b>
              </p>
              <button
                type="button"
                onClick={() => setPvpListRefreshKey(k => k + 1)}
                disabled={pvpOpponentsLoading || !playerId}
                style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: 'clamp(13px, 3.1vw, 15px)',
                  color: '#fff',
                  background: pvpOpponentsLoading || !playerId ? '#4b5563' : 'linear-gradient(180deg, #7c3aed, #5b21b6)',
                  border: '1px solid rgba(196, 181, 253, 0.55)',
                  borderRadius: '12px',
                  cursor: pvpOpponentsLoading || !playerId ? 'not-allowed' : 'pointer',
                  boxShadow: pvpOpponentsLoading || !playerId ? 'none' : '0 4px 14px rgba(91, 33, 182, 0.5)',
                }}
              >
                {pvpOpponentsLoading ? '…' : 'Обновить'}
              </button>
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
                    src={getPvpOpponentAvatarUrl(opp)}
                    alt=""
                    width={44}
                    height={44}
                    style={{
                      flexShrink: 0,
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
                <button
                  type="button"
                  onClick={() => onPvpBattle(opp)}
                  style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(180deg, #7c3aed, #5b21b6)',
                    color: '#fff',
                    border: '1px solid rgba(196, 181, 253, 0.4)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 900,
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(91, 33, 182, 0.45)',
                  }}
                >
                  <Icon3D id="pvp-3d" size={30} /> БОЙ 3×3
                </button>
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
              Один слабый вражеский отряд: тренировка механики. Награда небольшая, прогресс по главам <b style={{ color: '#a5b4fc' }}>не сдвигается</b>.
            </p>
            <button
              type="button"
              onClick={onStartTrainingPve}
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
              }}
            >
              Старт обучения
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
                  const locked = !canEnterPveStage(currentChapter, lvl);
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
    </div>
  );
}
