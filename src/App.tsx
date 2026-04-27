import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { getTelegramUserDisplayName, getTelegramWebApp } from './telegram';
import { gftCreateDeposit, gftVerifyDeposit, xamanCreateSignIn, xamanGetPayload } from './xaman';
import { getNftBonusesForPlayer, getXrpBalance, type NftBonuses } from './xrplClient';
import { getZodiacAvatarUrl } from './zodiacAvatars';
import { getRarityFrameUrl } from './ui/rarityFrames';
import { Icon3D } from './ui/Icon3D';
import { BattleVfxOverlay, type BattleVfx } from './ui/BattleVfxOverlay';
import { CHARACTER_CARDS } from './cards/catalog';
import type { CardAbility, CardRarity, CharacterCard } from './cards/catalog';
import { getCharacterCardImageUrl } from './cards/images';
import {
  CARD_CRAFT_COST,
  CARD_PACKS,
  CARD_RARITY_ORDER,
  CARD_RARITY_UPGRADE_COST,
  CARD_RARITY_UPGRADE_TARGET,
  getCraftableCards,
  getRarityUpgradePool,
  openCardPack,
  rollRarityUpgradeReward,
  type CardPackType,
} from './cards/acquisition';
import { registerPlayer } from './playerRegistry';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES, BONUS_LABELS, CRAFT_RECIPES, RARITY_CONFIG } from './artifacts/balance';
import { createArtifact, createPveArtifact, createStarterArtifacts } from './artifacts/generator';
import {
  EMPTY_EQUIPPED_ARTIFACTS,
  calculateArtifactStats,
  equipArtifact as equipArtifactInSlot,
  getDismantleReward,
  getUpgradeCost,
  isArtifactEquipped,
  normalizeEquippedArtifacts,
  unequipArtifact as unequipArtifactInSlot,
  upgradeArtifactLevel,
  type EquippedArtifacts,
} from './artifacts/inventory';
import type { Artifact, ArtifactBonus, ArtifactRarity, ArtifactType } from './artifacts/types';
import { ArtifactsScreen } from './screens/ArtifactsScreen';
import { CraftScreen } from './screens/CraftScreen';
import {
  createCardUid,
  generatePveEnemy,
  randomItem,
  randomRange,
  rollBotAbility,
  type SquadHero,
} from './game/battle';
import {
  ackPlayerClientNotices,
  claimPlayerBattleReward,
  claimPlayerDailyReward,
  claimPlayerHold,
  loadPlayerProgress,
  openPlayerCardPack,
  savePlayerProgress,
  sendPlayerPresenceHeartbeat,
  fetchPvpOpponents,
  startPlayerBattleSession,
  startPlayerHold,
} from './playerProgress';
import type { ClientProgressNotice, PvpOpponentInfo } from './playerProgress';
import { API_BASE } from './apiConfig';

type Screen = 'home' | 'arena' | 'team' | 'farm' | 'shop' | 'levelup' | 'artifacts' | 'craft' | 'battlepass';
type GamePhase = 'loading' | 'create' | 'playing';
type ArenaSubScreen = 'main' | 'pve' | 'pvp' | 'ranking';
type ArenaRankingPeriod = 'week' | 'month';

type MainHero = SquadHero;

type CardAbilityKey = 'basic' | 'skill';
type CardBattleTurn = 'player' | 'bot' | 'ended';

type CardFighter = {
  uid: string;
  name: string;
  role: string;
  emoji: string;
  image: string;
  rarity?: string;
  maxHP: number;
  hp: number;
  power: number;
  speed: number;
  abilities: Record<CardAbilityKey, CardAbility>;
  cooldowns: Record<CardAbilityKey, number>;
  shield: number;
  stunnedTurns: number;
  dotDamage: number;
  dotTurns: number;
};

type CardBattleState = {
  sessionId: string;
  opponent: { id: number; name: string; emoji: string; power: number; maxHP: number };
  mode: 'pvp' | 'pve';
  pveContext?: { chapter: number; level: number; isBoss: boolean; isTraining?: boolean };
  /** Клиент: обучающий PvE — слабый бот и подсказки */
  isTrainingPve?: boolean;
  turn: CardBattleTurn;
  round: number;
  playerTeam: CardFighter[];
  botTeam: CardFighter[];
  turnOrder: string[];
  activeFighterUid: string | null;
  selectedAttackerUid: string | null;
  selectedTargetUid: string | null;
  selectedAllyUid: string | null;
  auto: boolean;
  log: string[];
};

type BattlePassReward = {
  label: string;
  coins?: number;
  crystals?: number;
  materials?: number;
  shards?: number;
  cardPack?: CardPackType;
  artifact?: { type?: ArtifactType; rarity: ArtifactRarity };
};

type BattlePassTier = {
  level: number;
  free: BattlePassReward;
  paid: BattlePassReward;
};

type BattlePassQuestKind =
  | 'onboarding'
  | 'pve_training'
  | 'hold_start'
  | 'pvp_start'
  | 'pve_start'
  | 'card_pack_open'
  | 'premium_elite';

type BattlePassQuest = {
  id: BattlePassQuestKind;
  title: string;
  description: string;
  target: number;
  xpPerStep: number;
  accent: string;
  /** Задания премиум-трека дают XP только при активном премиум BP. */
  track?: 'free' | 'paid';
};

type ArenaRankingEntry = {
  place: number;
  name: string;
  score: number;
  wins: number;
  /** Серверный игровой id — для подсветки «ты» в таблице тестеров */
  playerId?: string;
};

type ArenaRankingReward = {
  place: string;
  reward: string;
  accent: string;
};

type DailyReward = {
  tier: string;
  description: string;
  accent: string;
  coins: number;
  crystals: number;
  materials: number;
  shards: number;
  gft: number;
};

type BattleRewardModal = {
  result: 'win' | 'lose';
  title: string;
  subtitle: string;
  rewards: string[];
};

type SavedGameProgress = {
  version: 1;
  userName: string;
  mainHero: MainHero | null;
  currencies: {
    gft: number;
    crystals: number;
    coins: number;
    rating: number;
    energy: number;
  };
  pve: {
    currentChapter: number;
    currentLevel: number;
  };
  cards: {
    collection: Record<string, number>;
    shards: number;
    squadIds: string[];
  };
  artifacts: {
    items: Artifact[];
    equipped: EquippedArtifacts;
    materials: number;
  };
  battlePass: {
    premium: boolean;
    claimedRewards: string[];
    questProgress: Record<BattlePassQuestKind, number>;
  };
  hold?: {
    endTime: number | null;
    lockedGft: number;
    earnings: number;
    rewardRate?: number;
  };
  dailyReward?: {
    claimedDate: string;
  };
  /** Сервер: не сохраняем из клиентского state в PUT — очередь уведомлений о зачислениях */
  clientNotices?: ClientProgressNotice[];
  savedAt: string;
};

function SingleGrantToast({
  id: toastId,
  message,
  onDismiss,
}: {
  id: string;
  message: string;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toastId), 9000);
    return () => window.clearTimeout(t);
  }, [toastId, onDismiss]);
  return (
    <div
      role="status"
      onClick={() => onDismiss(toastId)}
      style={{
        padding: '12px 16px',
        maxWidth: 'min(100vw - 32px, 400px)',
        background: 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(20,30,50,0.95))',
        border: '1px solid #4ade80',
        borderRadius: '14px',
        color: '#ecfccb',
        fontSize: 'clamp(13px, 3.2vw, 15px)',
        fontWeight: 700,
        lineHeight: 1.4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      {message}
    </div>
  );
}

const allHeroes: Array<SquadHero & { owned: boolean }> = [
  { id: 1,  name: "Огненный Овен", zodiac: "Овен", emoji: "♈", image: getZodiacAvatarUrl("Овен"), rarity: "Legendary", basePower: 95, level: 1, exp: 0, stars: 1, owned: true },
  { id: 2,  name: "Земной Телец", zodiac: "Телец", emoji: "♉", image: getZodiacAvatarUrl("Телец"), rarity: "Epic", basePower: 78, level: 1, exp: 0, stars: 1, owned: true },
  { id: 3,  name: "Ветреные Близнецы", zodiac: "Близнецы", emoji: "♊", image: getZodiacAvatarUrl("Близнецы"), rarity: "Rare", basePower: 52, level: 1, exp: 0, stars: 1, owned: true },
  { id: 4,  name: "Лунный Рак", zodiac: "Рак", emoji: "♋", image: getZodiacAvatarUrl("Рак"), rarity: "Rare", basePower: 49, level: 1, exp: 0, stars: 1, owned: false },
  { id: 5,  name: "Солнечный Лев", zodiac: "Лев", emoji: "♌", image: getZodiacAvatarUrl("Лев"), rarity: "Epic", basePower: 88, level: 1, exp: 0, stars: 1, owned: false },
  { id: 6,  name: "Кристаллическая Дева", zodiac: "Дева", emoji: "♍", image: getZodiacAvatarUrl("Дева"), rarity: "Legendary", basePower: 102, level: 1, exp: 0, stars: 1, owned: false },
  { id: 7,  name: "Звёздные Весы", zodiac: "Весы", emoji: "♎", image: getZodiacAvatarUrl("Весы"), rarity: "Epic", basePower: 65, level: 1, exp: 0, stars: 1, owned: false },
  { id: 8,  name: "Тёмный Скорпион", zodiac: "Скорпион", emoji: "♏", image: getZodiacAvatarUrl("Скорпион"), rarity: "Rare", basePower: 72, level: 1, exp: 0, stars: 1, owned: false },
  { id: 9,  name: "Громовой Стрелец", zodiac: "Стрелец", emoji: "♐", image: getZodiacAvatarUrl("Стрелец"), rarity: "Epic", basePower: 81, level: 1, exp: 0, stars: 1, owned: false },
  { id: 10, name: "Горный Козерог", zodiac: "Козерог", emoji: "♑", image: getZodiacAvatarUrl("Козерог"), rarity: "Legendary", basePower: 97, level: 1, exp: 0, stars: 1, owned: false },
  { id: 11, name: "Электрический Водолей", zodiac: "Водолей", emoji: "♒", image: getZodiacAvatarUrl("Водолей"), rarity: "Rare", basePower: 59, level: 1, exp: 0, stars: 1, owned: false },
  { id: 12, name: "Морские Рыбы", zodiac: "Рыбы", emoji: "♓", image: getZodiacAvatarUrl("Рыбы"), rarity: "Epic", basePower: 68, level: 1, exp: 0, stars: 1, owned: false },
];

const BATTLEPASS_PRICE_GFT = 120;

const BATTLEPASS_TIERS_FIRST: BattlePassTier[] = [
  { level: 1, free: { label: 'Старт: 800 монет (обучение)', coins: 800 }, paid: { label: '40 кристаллов', crystals: 40 } },
  { level: 2, free: { label: '30 материалов', materials: 30 }, paid: { label: 'Обычный набор карт', cardPack: 'basic' } },
  { level: 3, free: { label: '20 осколков', shards: 20 }, paid: { label: 'Rare артефакт', artifact: { rarity: 'Rare' } } },
  { level: 4, free: { label: '1200 монет', coins: 1200 }, paid: { label: '80 кристаллов', crystals: 80 } },
  { level: 5, free: { label: '50 материалов', materials: 50 }, paid: { label: 'Epic артефакт', artifact: { rarity: 'Epic' } } },
  { level: 6, free: { label: '35 осколков', shards: 35 }, paid: { label: '5000 монет', coins: 5000 } },
  { level: 7, free: { label: 'Rare артефакт', artifact: { rarity: 'Rare' } }, paid: { label: '120 кристаллов', crystals: 120 } },
  { level: 8, free: { label: '75 материалов', materials: 75 }, paid: { label: 'Epic артефакт', artifact: { rarity: 'Epic' } } },
  { level: 9, free: { label: '60 осколков', shards: 60 }, paid: { label: 'Legendary артефакт', artifact: { rarity: 'Legendary' } } },
  { level: 10, free: { label: '3000 монет + 100 материалов', coins: 3000, materials: 100 }, paid: { label: 'Mythic артефакт + мифический набор', cardPack: 'mythic', artifact: { rarity: 'Mythic' } } },
];

/** Уровни 11–50: нарастающие награды, бесплатная дорожка — фарм, премиум — кристаллы/наборы */
const BATTLEPASS_TIERS_REST: BattlePassTier[] = Array.from({ length: 40 }, (_, i) => {
  const level = 11 + i;
  const s = 1 + Math.floor((level - 11) / 10);
  const c = 400 * s + level * 8;
  const m = 18 + s * 5 + (level % 6) * 2;
  const sh = 10 + s * 3 + (level % 5) * 2;
  const cry = 6 + s * 2 + (level % 7);
  const phase = (level - 11) % 4;
  if (phase === 0) {
    return {
      level,
      free: { label: `${c} монет`, coins: c },
      paid: { label: `${cry + 10} кристаллов`, crystals: cry + 10 },
    };
  }
  if (phase === 1) {
    return {
      level,
      free: { label: `${m} материалов`, materials: m },
      paid: { label: `${Math.min(200, 18 + s * 5)} материалов (премиум)`, materials: Math.min(200, 18 + s * 5) },
    };
  }
  if (phase === 2) {
    return {
      level,
      free: { label: `${sh} осколков`, shards: sh },
      paid: { label: `${cry + 20} кристаллов`, crystals: cry + 20 },
    };
  }
  return {
    level,
    free: { label: `${Math.floor(c * 0.5)} монет + ${Math.floor(m * 0.4)} мат.`, coins: Math.floor(c * 0.5), materials: Math.floor(m * 0.4) },
    paid: level % 5 === 0
      ? { label: 'Премиум-набор карт', cardPack: 'premium' }
      : { label: `${30 + s * 4} кристаллов`, crystals: 30 + s * 4 },
  };
});

const BATTLEPASS_TIERS: BattlePassTier[] = [...BATTLEPASS_TIERS_FIRST, ...BATTLEPASS_TIERS_REST];

const BATTLEPASS_XP_PER_LEVEL = 100;
const HOLD_DURATION_MS = 6 * 60 * 60 * 1000;
const HOLD_REWARD_RATE = 0.02;

/** localStorage: однократное стартовое обучение после экрана создания героя */
const ONBOARDING_DONE_KEY = 'gft_onboarding_done_v1';

const ONBOARDING_STEPS: { title: string; body: string }[] = [
  {
    title: 'Добро пожаловать',
    body: 'GFT Arena — тактические бои картами, прогресс героя и артефакты. В шапке отображаются монеты, кристаллы, GFT, энергия и рейтинг. Кнопка Xaman подключает кошелёк для GFT, когда будешь готов.',
  },
  {
    title: 'Нижнее меню',
    body: 'Главная — профиль и быстрые действия. Арена — PvE-кампания, PvP и карточные дуэли. Отряд — герой зодиака, колода карт и крафт. Магазин — наборы карт и обмен.',
  },
  {
    title: 'Главный экран',
    body: 'Плитки «Прокачка» и «HOLD-фарм» ведут к развитию героя и пассивному доходу GFT. Забирай ежедневную награду, когда она доступна.',
  },
  {
    title: 'Удачи в боях',
    body: 'Переключайся между разделами через панель внизу. Это краткое обучение больше не покажется на этом устройстве.',
  },
];

const BATTLEPASS_QUESTS: BattlePassQuest[] = [
  {
    id: 'onboarding',
    title: 'Вводный тур',
    description: 'Пройди окно «Добро пожаловать» на главной после выбора героя (Далее → В игру).',
    target: 1,
    xpPerStep: 40,
    accent: '#38bdf8',
  },
  {
    id: 'pve_training',
    title: 'Тренировочный PvE',
    description: 'Победи в обучающем бою: Арена → PVE → «Старт обучения».',
    target: 1,
    xpPerStep: 60,
    accent: '#2dd4bf',
  },
  {
    id: 'pve_start',
    title: 'Походы по кампании',
    description: 'Проходи уровни PVE (после тренировки). Обучающий матч тоже считается в общий PVE-прогресс.',
    target: 60,
    xpPerStep: 40,
    accent: '#0ea5e9',
  },
  {
    id: 'hold_start',
    title: 'HOLD-фарм',
    description: 'Запускай добычу GFT на главной. Часть стартового обучения — попробовать экономику фермы.',
    target: 10,
    xpPerStep: 45,
    accent: '#22c55e',
  },
  {
    id: 'pvp_start',
    title: 'Арена PVP / карточные дуэли',
    description: 'Карточные бои 3×3 в разделе Арена. Задание продолжает путь после PvE.',
    target: 25,
    xpPerStep: 40,
    accent: '#f97316',
  },
  {
    id: 'card_pack_open',
    title: 'Наборы карт',
    description: 'Открывай наборы в магазине, в наградах батлпасса и за достижения.',
    target: 19,
    xpPerStep: 50,
    accent: '#c084fc',
  },
  {
    id: 'premium_elite',
    title: 'Элитные победы',
    description: 'Победы в карточных боях PVP (доп. XP за премиум Battle Pass).',
    target: 12,
    xpPerStep: 55,
    accent: '#e879f9',
    track: 'paid',
  },
];

const createBattlePassProgress = (): Record<BattlePassQuestKind, number> =>
  BATTLEPASS_QUESTS.reduce(
    (progress, quest) => ({ ...progress, [quest.id]: 0 }),
    {} as Record<BattlePassQuestKind, number>,
  );

function getTimestamp() {
  return Date.now();
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSavedGameProgress(value: unknown): value is SavedGameProgress {
  if (!isRecord(value)) return false;
  return value.version === 1 && isRecord(value.currencies) && isRecord(value.cards) && isRecord(value.artifacts) && isRecord(value.battlePass);
}

/** Моки отключены: таблица строится с сервера `/api/arena/leaderboard` (все зарегистрированные тестеры). */

const ARENA_RANKING_REWARDS: Record<ArenaRankingPeriod, ArenaRankingReward[]> = {
  week: [
    { place: '1 место', reward: '300 кристаллов, 12000 монет, мифический набор', accent: '#facc15' },
    { place: '2-3 место', reward: '180 кристаллов, 8000 монет, элитный набор', accent: '#c4b5fd' },
    { place: '4-10 место', reward: '90 кристаллов, 4500 монет, 80 осколков', accent: '#38bdf8' },
    { place: '11-50 место', reward: '35 кристаллов, 2000 монет', accent: '#22c55e' },
  ],
  month: [
    { place: '1 место', reward: '1200 кристаллов, 50000 монет, 2 мифических набора', accent: '#facc15' },
    { place: '2-3 место', reward: '750 кристаллов, 32000 монет, мифический набор', accent: '#c4b5fd' },
    { place: '4-10 место', reward: '400 кристаллов, 18000 монет, элитный набор', accent: '#38bdf8' },
    { place: '11-100 место', reward: '120 кристаллов, 7000 монет, 150 осколков', accent: '#22c55e' },
  ],
};

const EMPTY_NFT_BONUSES: NftBonuses = {
  collections: [
    { id: 'dualForce', name: 'GFT Dual Force', available: true, owned: false, count: 0, holdRewardBonus: 0, gameRewardBonus: 0 },
    { id: 'cryptoAlliance', name: 'CRYPTO ALLIANCE', available: true, owned: false, count: 0, holdRewardBonus: 0, gameRewardBonus: 0 },
    { id: 'genesisCrown', name: 'GFT Genesis Crown', available: false, owned: false, count: 0, holdRewardBonus: 0, gameRewardBonus: 0 },
  ],
  holdRewardBonus: 0,
  gameRewardBonus: 0,
  checkedAt: '',
};

function normalizeArtifact(raw: Partial<Artifact> & { bonus?: Record<string, number> }): Artifact {
  if (
    raw.id &&
    raw.name &&
    raw.type &&
    raw.rarity &&
    raw.primaryBonus &&
    raw.secondaryBonuses &&
    raw.maxLevel
  ) {
    return raw as Artifact;
  }

  const type = raw.type ?? 'weapon';
  const rarity = raw.rarity ?? 'Common';
  const fallback = createArtifact(type, raw.createdFrom ?? 'starter', rarity);
  const legacyBonus = raw.bonus ?? {};
  const legacyPrimaryKey = (Object.keys(legacyBonus)[0] as ArtifactBonus['key'] | undefined) ?? CRAFT_RECIPES[type].primaryBonus;

  return {
    ...fallback,
    id: raw.id ?? fallback.id,
    name: raw.name ?? fallback.name,
    type,
    rarity,
    power: raw.power ?? fallback.power,
    level: raw.level ?? 1,
    emoji: raw.emoji ?? fallback.emoji,
    primaryBonus: {
      key: legacyPrimaryKey,
      value: legacyBonus[legacyPrimaryKey] ?? fallback.primaryBonus.value,
    },
    secondaryBonuses: raw.secondaryBonuses ?? [],
    maxLevel: raw.maxLevel ?? RARITY_CONFIG[rarity].maxLevel,
    createdFrom: raw.createdFrom ?? 'starter',
    locked: raw.locked ?? false,
  };
}

const PVP_OPPONENT_EMOJIS = ['🥷', '🐂', '🦊', '🐉', '⚔️', '🛡️', '🎯', '🌟', '💀', '🛸', '🐺', '🦁'] as const;

function pvpEmojiForPlayerId(playerId: string): string {
  const n = Number(playerId);
  const i = Number.isFinite(n) ? Math.abs(n) % PVP_OPPONENT_EMOJIS.length : 0;
  return PVP_OPPONENT_EMOJIS[i];
}

export default function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('loading');
  const [pendingPhase, setPendingPhase] = useState<Exclude<GamePhase, 'loading'>>('create');
  const [loadProgress, setLoadProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [bootStartedAt] = useState(() => Date.now());
  const [screen, setScreen] = useState<Screen>('home');
  const [arenaSubScreen, setArenaSubScreen] = useState<ArenaSubScreen>('main');
  const [arenaRankingPeriod, setArenaRankingPeriod] = useState<ArenaRankingPeriod>('week');
  const [arenaLeaderboardEntries, setArenaLeaderboardEntries] = useState<ArenaRankingEntry[]>([]);
  const [arenaLeaderboardLoading, setArenaLeaderboardLoading] = useState(false);
  const [arenaLeaderboardError, setArenaLeaderboardError] = useState(false);
  const [pvpOpponents, setPvpOpponents] = useState<PvpOpponentInfo[]>([]);
  const [pvpOpponentsLoading, setPvpOpponentsLoading] = useState(false);
  const [pvpOpponentsError, setPvpOpponentsError] = useState(false);
  const [pvpListRefreshKey, setPvpListRefreshKey] = useState(0);
  const [mainHero, setMainHero] = useState<MainHero | null>(null);
  /** Игровой ник (выбирает игрок). */
  const [userName, setUserName] = useState('');
  /** Имя/отображаемое имя из Telegram WebApp (не ник в игре). */
  const [telegramDisplayName] = useState<string | null>(() => getTelegramUserDisplayName(getTelegramWebApp()?.initDataUnsafe?.user));
  const [telegramUsername] = useState<string | null>(() => {
    const username = getTelegramWebApp()?.initDataUnsafe?.user?.username;
    return username ? `@${username}` : null;
  });
  const [telegramUserId] = useState<number | null>(() => getTelegramWebApp()?.initDataUnsafe?.user?.id ?? null);
  const [isTelegram] = useState(() => Boolean(getTelegramWebApp()));
  /** Публичный игровой ID, который сервер выдаёт по порядку регистрации. */
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('gft_player_id') ?? '');
  /** После первого ответа POST /api/player/register (успех или ошибка). */
  const [playerRegisterSettled, setPlayerRegisterSettled] = useState(false);
  const [progressHydrated, setProgressHydrated] = useState(() => !localStorage.getItem('gft_player_id'));

  const blockIfNoPlayerId = (): boolean => {
    if (playerId) return false;
    if (!playerRegisterSettled) {
      alert('Профиль игрока ещё загружается. Подожди пару секунд и попробуй снова.');
    } else {
      alert(
        'Не удалось получить игровой ID с сервера.\n\nПроверь доступ к API, CORS (FRONTEND_ORIGIN) и адрес VITE_API_BASE при сборке. Обнови страницу.',
      );
    }
    return true;
  };
  const [grantToasts, setGrantToasts] = useState<Array<{ id: string; message: string }>>([]);
  const [cardSquadIds, setCardSquadIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('gft_card_squad_v1');
      if (raw) return JSON.parse(raw) as string[];
    } catch {
      // ignore corrupt local squad
    }
    return [];
  });
  const [cardBattle, setCardBattle] = useState<CardBattleState | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const [mainInsets, setMainInsets] = useState({ top: 132, bottom: 100 });
  /** Высота шапки/таббара уже включает safe-area из их padding — не дублировать env(). */
  const mainScrollPadding: CSSProperties = useMemo(
    () => ({
      paddingTop: `${mainInsets.top}px`,
      paddingBottom: `${mainInsets.bottom}px`,
    }),
    [mainInsets.top, mainInsets.bottom],
  );
  /** Резерв под фиксированные аватар + карточка (нижний край карточки + отступ до «GFT ARENA»). */
  const homeProfileStackReserve = 'clamp(124px, 34vw, 156px)';
  useLayoutEffect(() => {
    const measure = () => {
      const top = headerRef.current?.getBoundingClientRect().height ?? 132;
      const bottom =
        gamePhase === 'playing' && !cardBattle && bottomNavRef.current
          ? bottomNavRef.current.getBoundingClientRect().height
          : 16;
      setMainInsets({ top, bottom });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    if (bottomNavRef.current) ro.observe(bottomNavRef.current);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [gamePhase, cardBattle, screen]);
  const [battleVfx, setBattleVfx] = useState<BattleVfx | null>(null);
  const [selectedExchangeRarity, setSelectedExchangeRarity] = useState<CardRarity>('Common');
  const [selectedExchangeCardIds, setSelectedExchangeCardIds] = useState<string[]>([]);
  const [receivedCard, setReceivedCard] = useState<CharacterCard | null>(null);
  const [receivedArtifact, setReceivedArtifact] = useState<{ artifact: Artifact; source: 'pve' | 'battlepass'; subtitle?: string } | null>(null);
  const [battleRewardModal, setBattleRewardModal] = useState<BattleRewardModal | null>(null);
  const [battlePassPremium, setBattlePassPremium] = useState(() => localStorage.getItem('gft_battlepass_premium_v1') === '1');
  const [claimedBattlePassRewards, setClaimedBattlePassRewards] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('gft_battlepass_claimed_v1');
      return raw ? JSON.parse(raw) as string[] : [];
    } catch {
      return [];
    }
  });
  const [battlePassQuestProgress, setBattlePassQuestProgress] = useState<Record<BattlePassQuestKind, number>>(() => {
    try {
      const raw = localStorage.getItem('gft_battlepass_quests_v1');
      return { ...createBattlePassProgress(), ...(raw ? JSON.parse(raw) as Partial<Record<BattlePassQuestKind, number>> : {}) };
    } catch {
      return createBattlePassProgress();
    }
  });
  const [teamTab, setTeamTab] = useState<'squad' | 'cards'>('squad');
  const [holdEndTime, setHoldEndTime] = useState<number | null>(null);
  const [holdLockedGft, setHoldLockedGft] = useState(0);
  const [holdEarnings, setHoldEarnings] = useState(0);
  const [holdRewardRate, setHoldRewardRate] = useState(HOLD_REWARD_RATE);
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdAmountInput, setHoldAmountInput] = useState('100');
  const [dailyRewardClaimedDate, setDailyRewardClaimedDate] = useState(() => localStorage.getItem('gft_daily_reward_claimed_v1') ?? '');
  const [now, setNow] = useState(getTimestamp);
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const [balance, setBalance] = useState(1500); // GFT: донатная валюта
  const [crystals, setCrystals] = useState(10000); // Кристаллы: редкая игровая валюта за достижения и сложный прогресс
  const [coins, setCoins] = useState(20000); // Монеты: бесплатная валюта за обычную игру
  const [rating, setRating] = useState(1240); // Рейтинг PVP
  const [energy, setEnergy] = useState(100); // Энергия для боев (макс 100)
  const [maxEnergy] = useState(100);

  useEffect(() => {
    if (!battleVfx) return;
    const timeout = window.setTimeout(() => setBattleVfx(null), 980);
    return () => window.clearTimeout(timeout);
  }, [battleVfx]);

  useEffect(() => {
    let cancelled = false;
    const zodiacs = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
    const rarities: Array<'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'> = ['Common','Rare','Epic','Legendary','Mythic'];

    /** Первый экран и нижнее меню — не блокируем вход из‑за тяжёлых аватаров и рамок. */
    const criticalUrls: string[] = [
      '/images/backgrounds/loading-bg.png',
      '/images/backgrounds/hero-select-bg.png',
      '/images/backgrounds/home-bg.png',
      '/images/ui/nav-home-bg.png',
      '/images/ui/nav-arena-bg.png',
      '/images/ui/nav-team-bg.png',
      '/images/ui/nav-shop-bg.png',
    ];
    const deferredUrls: string[] = [
      '/images/backgrounds/arena-bg.png',
      '/images/backgrounds/team-bg.png',
      '/images/backgrounds/farm-bg.png',
      '/images/backgrounds/progression-bg.png',
      ...zodiacs.map(z => getZodiacAvatarUrl(z)),
      ...rarities.map(r => getRarityFrameUrl(r)),
    ];

    const loadOne = (u: string) =>
      new Promise<void>(resolve => {
        const img = new Image();
        const finish = () => resolve();
        img.onload = finish;
        img.onerror = finish;
        img.src = u;
      });

    const totalCritical = criticalUrls.length;
    let doneCritical = 0;
    let criticalFinalized = false;
    const tickCritical = () => {
      if (criticalFinalized || cancelled) return;
      doneCritical += 1;
      setLoadProgress(Math.min(doneCritical / totalCritical, 1));
    };

    const criticalCapMs = 2800;
    const criticalWork = Promise.all(
      criticalUrls.map(u =>
        loadOne(u).then(() => {
          tickCritical();
        }),
      ),
    );

    const cap = new Promise<void>(resolve => {
      window.setTimeout(resolve, criticalCapMs);
    });

    void Promise.race([criticalWork, cap]).then(() => {
      if (cancelled) return;
      criticalFinalized = true;
      setLoadProgress(1);
      setAssetsReady(true);
    });

    void Promise.all(deferredUrls.map(loadOne));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gamePhase !== 'loading') return;
    if (!assetsReady || !progressHydrated) return;
    const elapsed = Date.now() - bootStartedAt;
    const minDuration = 420;
    const wait = Math.max(0, minDuration - elapsed);
    const t = window.setTimeout(() => setGamePhase(pendingPhase), wait);
    return () => window.clearTimeout(t);
  }, [gamePhase, assetsReady, progressHydrated, pendingPhase, bootStartedAt]);

  useEffect(() => {
    if (gamePhase !== 'playing' || !mainHero || !progressHydrated) return;
    if (cardBattle) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(ONBOARDING_DONE_KEY) === '1') return;
    const id = requestAnimationFrame(() => {
      setOnboardingStep(prev => (prev === null ? 0 : prev));
    });
    return () => cancelAnimationFrame(id);
  }, [gamePhase, mainHero, progressHydrated, cardBattle]);

  useEffect(() => {
    localStorage.setItem('gft_battlepass_premium_v1', battlePassPremium ? '1' : '0');
  }, [battlePassPremium]);

  useEffect(() => {
    localStorage.setItem('gft_battlepass_claimed_v1', JSON.stringify(claimedBattlePassRewards));
  }, [claimedBattlePassRewards]);

  useEffect(() => {
    localStorage.setItem('gft_battlepass_quests_v1', JSON.stringify(battlePassQuestProgress));
  }, [battlePassQuestProgress]);

  useEffect(() => {
    localStorage.setItem('gft_daily_reward_claimed_v1', dailyRewardClaimedDate);
  }, [dailyRewardClaimedDate]);

  useEffect(() => {
    const interval = window.setInterval(() => setTodayKey(getTodayKey()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);
  
  // PVE состояния
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [materials, setMaterials] = useState(() => {
    const raw = localStorage.getItem('gft_materials_v2');
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  
  // Артефакты
  const [artifacts, setArtifacts] = useState<Artifact[]>(() => {
    try {
      const raw = localStorage.getItem('gft_artifacts_v2') ?? localStorage.getItem('gft_artifacts_v1');
      if (raw) return (JSON.parse(raw) as Array<Partial<Artifact> & { bonus?: Record<string, number> }>).map(normalizeArtifact);
    } catch {
      // ignore corrupt local state and use starter items
    }
    return createStarterArtifacts();
  });
  const [equippedArtifacts, setEquippedArtifacts] = useState<EquippedArtifacts>(() => {
    try {
      const raw = localStorage.getItem('gft_equipped_artifacts_v2');
      if (raw) return normalizeEquippedArtifacts(JSON.parse(raw) as Partial<EquippedArtifacts>);
    } catch {
      // ignore corrupt local state and use starter slots
    }
    return { ...EMPTY_EQUIPPED_ARTIFACTS, weapon: 'wep1', armor: 'arm1' };
  });
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [artifactTypeFilter, setArtifactTypeFilter] = useState<ArtifactType | 'all'>('all');
  const [artifactRarityFilter, setArtifactRarityFilter] = useState<ArtifactRarity | 'all'>('all');
  const artifactStats = calculateArtifactStats(artifacts, equippedArtifacts);

  const [xrplAccount, setXrplAccount] = useState<string | null>(() => localStorage.getItem('xrpl_account'));
  const [xrpBalance, setXrpBalance] = useState<string | null>(null);
  const [nftBonuses, setNftBonuses] = useState<NftBonuses>(EMPTY_NFT_BONUSES);
  const [nftBonusBusy, setNftBonusBusy] = useState(false);
  const [xamanBusy, setXamanBusy] = useState(false);
  const [depositAmount, setDepositAmount] = useState('10');
  const [depositBusy, setDepositBusy] = useState(false);

  function earnGFT(amount: number) {
    setBalance(b => b + amount);
  }

  function earnCrystals(amount: number) {
    setCrystals(c => c + amount);
  }

  function earnCoins(amount: number) {
    setCoins(c => c + amount);
  }

  const getNftCollectionCount = (id: NftBonuses['collections'][number]['id']) =>
    nftBonuses.collections.find(collection => collection.id === id)?.count ?? 0;

  const getDailyReward = (): DailyReward => {
    const dualCount = getNftCollectionCount('dualForce');
    const allianceCount = getNftCollectionCount('cryptoAlliance');
    const genesisCount = getNftCollectionCount('genesisCrown');
    const weightedCountBonus = Math.min(1.75, dualCount * 0.1 + allianceCount * 0.25 + genesisCount * 0.45);

    const tier = genesisCount > 0
      ? { name: 'Genesis Crown', description: 'Будущий максимальный NFT-уровень', accent: '#facc15', coins: 12000, crystals: 900, materials: 350, shards: 250, gft: 75 }
      : allianceCount > 0
        ? { name: 'Crypto Alliance', description: 'Премиальный NFT-уровень', accent: '#c084fc', coins: 7000, crystals: 450, materials: 180, shards: 120, gft: 25 }
        : dualCount > 0
          ? { name: 'Dual Force', description: 'Базовый NFT-уровень', accent: '#38bdf8', coins: 3500, crystals: 180, materials: 80, shards: 50, gft: 0 }
          : { name: 'Free', description: 'Бесплатная ежедневная награда', accent: '#22c55e', coins: 2000, crystals: 100, materials: 40, shards: 25, gft: 0 };

    return {
      tier: tier.name,
      description: weightedCountBonus > 0 ? `${tier.description} • множитель x${(1 + weightedCountBonus).toFixed(2)}` : tier.description,
      accent: tier.accent,
      coins: Math.round(tier.coins * (1 + weightedCountBonus)),
      crystals: Math.round(tier.crystals * (1 + weightedCountBonus)),
      materials: Math.round(tier.materials * (1 + weightedCountBonus)),
      shards: Math.round(tier.shards * (1 + weightedCountBonus)),
      gft: Math.round(tier.gft * (1 + weightedCountBonus)),
    };
  };

  const dailyReward = getDailyReward();
  const dailyRewardClaimedToday = dailyRewardClaimedDate === todayKey;

  const claimDailyReward = async () => {
    if (dailyRewardClaimedDate === todayKey) {
      alert('Ежедневная награда уже получена. Возвращайся завтра.');
      return;
    }
    if (blockIfNoPlayerId()) return;

    try {
      const result = await claimPlayerDailyReward(playerId, xrplAccount);
      const reward = result.reward;
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      else setDailyRewardClaimedDate(todayKey);
      alert(`🎁 Ежедневная награда (${reward.tier}) получена!\n+${reward.coins} монет\n+${reward.crystals} кристаллов\n+${reward.materials} материалов\n+${reward.shards} осколков${reward.gft > 0 ? `\n+${reward.gft} GFT` : ''}`);
    } catch {
      alert('Не удалось получить ежедневную награду. Проверь сервер и попробуй ещё раз.');
    }
  };

  const getBrowserIdentityKey = () => {
    const stored = localStorage.getItem('gft_registration_key');
    if (stored) return `browser:${stored}`;

    const key = crypto.randomUUID();
    localStorage.setItem('gft_registration_key', key);
    return `browser:${key}`;
  };

  useEffect(() => {
    let cancelled = false;
    const tg = getTelegramWebApp();
    let identityKey = getBrowserIdentityKey();

    if (tg) {
      try {
        tg.ready?.();
        tg.expand?.();
      } catch {
        // ignore: best-effort for non-Telegram environments
      }

      const user = tg.initDataUnsafe?.user;
      if (user?.id != null) {
        identityKey = `telegram:${user.id}`;
      }
    }

    (async () => {
      try {
        const { id } = await registerPlayer(identityKey);
        if (cancelled) return;
        const numericId = String(id);
        setProgressHydrated(false);
        setPlayerId(numericId);
        localStorage.setItem('gft_player_id', numericId);
      } catch {
        if (cancelled) return;
        setPlayerId(prev => {
          if (/^\d+$/.test(prev)) return prev;
          localStorage.removeItem('gft_player_id');
          return '';
        });
      } finally {
        if (!cancelled) setPlayerRegisterSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!xrplAccount) return;
    localStorage.setItem('xrpl_account', xrplAccount);
  }, [xrplAccount]);

  useEffect(() => {
    localStorage.setItem('gft_artifacts_v2', JSON.stringify(artifacts));
  }, [artifacts]);

  useEffect(() => {
    localStorage.setItem('gft_equipped_artifacts_v2', JSON.stringify(equippedArtifacts));
  }, [equippedArtifacts]);

  useEffect(() => {
    localStorage.setItem('gft_materials_v2', String(materials));
  }, [materials]);

  useEffect(() => {
    let cancelled = false;
    if (!playerId) return;

    if (!xrplAccount) {
      (async () => {
        try {
          setNftBonusBusy(true);
          const bonuses = await getNftBonusesForPlayer(playerId, null);
          if (!cancelled) {
            setXrpBalance(null);
            setNftBonuses(bonuses);
          }
        } catch {
          if (!cancelled) setNftBonuses(EMPTY_NFT_BONUSES);
        } finally {
          if (!cancelled) setNftBonusBusy(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        setNftBonusBusy(true);
        const [bal, bonuses] = await Promise.all([
          getXrpBalance(xrplAccount),
          getNftBonusesForPlayer(playerId, xrplAccount),
        ]);
        if (!cancelled) {
          setXrpBalance(bal);
          setNftBonuses(bonuses);
        }
      } catch {
        if (!cancelled) {
          setXrpBalance(null);
          setNftBonuses(EMPTY_NFT_BONUSES);
        }
      } finally {
        if (!cancelled) setNftBonusBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, xrplAccount]);

  const connectXaman = async () => {
    if (xamanBusy) return;
    setXamanBusy(true);
    try {
      const signIn = await xamanCreateSignIn();
      const link = signIn.next?.always;
      if (link) window.location.href = link;

      const start = getTimestamp();
      while (getTimestamp() - start < 2 * 60 * 1000) {
        const p = await xamanGetPayload(signIn.uuid);
        const account = p?.response?.account ?? null;
        if (account) {
          setXrplAccount(account);
          return;
        }
        if (p?.meta?.cancelled || p?.meta?.expired) return;
        await new Promise(r => setTimeout(r, 1500));
      }
    } finally {
      setXamanBusy(false);
    }
  };

  const disconnectXaman = () => {
    setXrplAccount(null);
    setXrpBalance(null);
    setNftBonuses(EMPTY_NFT_BONUSES);
    localStorage.removeItem('xrpl_account');
  };

  const depositGft = async () => {
    if (!xrplAccount) {
      alert('Сначала подключи кошелёк Xaman.');
      return;
    }
    if (depositBusy) return;
    const value = Number(depositAmount);
    if (!Number.isFinite(value) || value <= 0) {
      alert('Введите сумму депозита.');
      return;
    }

    setDepositBusy(true);
    try {
      const dep = await gftCreateDeposit(String(value));
      const link = dep.next?.always;
      if (link) window.location.href = link;

      const start = getTimestamp();
      while (getTimestamp() - start < 2 * 60 * 1000) {
        const v = await gftVerifyDeposit(dep.uuid);
        if (v.status === 'credited') {
          earnGFT(Number(v.amount));
          alert(`✅ Депозит подтверждён: +${v.amount} GFT`);
          return;
        }
        if (v.status === 'invalid') {
          alert(`❌ Депозит отклонён: ${v.reason}`);
          return;
        }
        if (v.status === 'cancelled' || v.status === 'expired') {
          alert('Депозит отменён/истёк.');
          return;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      alert('⏳ Не дождались подтверждения. Проверь статус позже.');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDepositBusy(false);
    }
  };

  const [collection, setCollection] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('gft_collection_v1');
      if (raw) return JSON.parse(raw) as Record<string, number>;
    } catch {
      // ignore
    }
    // Стартовая коллекция: первые 12 common карт.
    const starter: Record<string, number> = {};
    for (const c of CHARACTER_CARDS.slice(0, 12)) starter[c.id] = 1;
    return starter;
  });
  const [cardShards, setCardShards] = useState(() => {
    const raw = localStorage.getItem('gft_card_shards_v1');
    return raw ? Number(raw) || 0 : 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gft_collection_v1', JSON.stringify(collection));
    } catch {
      // ignore
    }
  }, [collection]);

  useEffect(() => {
    localStorage.setItem('gft_card_shards_v1', String(cardShards));
  }, [cardShards]);

  useEffect(() => {
    localStorage.setItem('gft_card_squad_v1', JSON.stringify(cardSquadIds));
  }, [cardSquadIds]);

  const applySavedProgress = useCallback((progress: SavedGameProgress) => {
    setUserName(progress.userName);
    setMainHero(progress.mainHero);
    setPendingPhase(progress.mainHero ? 'playing' : 'create');
    setBalance(progress.currencies.gft);
    setCrystals(progress.currencies.crystals);
    setCoins(progress.currencies.coins);
    setRating(progress.currencies.rating);
    setEnergy(Math.min(maxEnergy, progress.currencies.energy));
    setCurrentChapter(progress.pve.currentChapter);
    setCurrentLevel(progress.pve.currentLevel);
    setCollection(progress.cards.collection);
    setCardShards(progress.cards.shards);
    setCardSquadIds(progress.cards.squadIds);
    setArtifacts(progress.artifacts.items.map(normalizeArtifact));
    setEquippedArtifacts(normalizeEquippedArtifacts(progress.artifacts.equipped));
    setMaterials(progress.artifacts.materials);
    setBattlePassPremium(progress.battlePass.premium);
    setClaimedBattlePassRewards(progress.battlePass.claimedRewards);
    setBattlePassQuestProgress({ ...createBattlePassProgress(), ...progress.battlePass.questProgress });
    setHoldEndTime(progress.hold?.endTime ?? null);
    setHoldLockedGft(progress.hold?.lockedGft ?? 0);
    setHoldEarnings(progress.hold?.earnings ?? 0);
    setHoldRewardRate(progress.hold?.rewardRate ?? HOLD_REWARD_RATE);
    setHoldAmountInput(String(progress.hold?.lockedGft || 100));
    setDailyRewardClaimedDate(progress.dailyReward?.claimedDate ?? '');
  }, [
    maxEnergy,
    setArtifacts,
    setBalance,
    setBattlePassPremium,
    setBattlePassQuestProgress,
    setCardShards,
    setCardSquadIds,
    setClaimedBattlePassRewards,
    setCoins,
    setCollection,
    setCrystals,
    setCurrentChapter,
    setCurrentLevel,
    setDailyRewardClaimedDate,
    setEnergy,
    setEquippedArtifacts,
    setHoldAmountInput,
    setHoldEarnings,
    setHoldEndTime,
    setHoldLockedGft,
    setHoldRewardRate,
    setMainHero,
    setMaterials,
    setPendingPhase,
    setRating,
    setUserName,
  ]);

  const removeGrantToast = useCallback((id: string) => {
    setGrantToasts(s => s.filter(t => t.id !== id));
  }, []);

  const processPendingClientNotices = useCallback(
    (progress: SavedGameProgress) => {
      const raw = progress.clientNotices;
      if (!Array.isArray(raw) || raw.length === 0) return;
      const list: { id: string; message: string }[] = [];
      for (const item of raw) {
        if (!isRecord(item)) continue;
        if (typeof item.id !== 'string' || typeof item.message !== 'string') continue;
        list.push({ id: item.id, message: item.message });
      }
      if (list.length === 0) return;
      setGrantToasts(prev => {
        const have = new Set(prev.map(t => t.id));
        const toAdd = list.filter(n => !have.has(n.id));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      });
      void ackPlayerClientNotices(
        playerId,
        list.map(n => n.id),
      ).catch(() => {
        // повтор с опроса, если сеть мигнула
      });
    },
    [playerId],
  );

  const applyServerProgressAndNotices = useCallback(
    (progress: unknown) => {
      if (!isSavedGameProgress(progress)) return;
      applySavedProgress(progress);
      processPendingClientNotices(progress);
    },
    [applySavedProgress, processPendingClientNotices],
  );

  useEffect(() => {
    let cancelled = false;
    if (!playerId) return;

    (async () => {
      try {
        const { progress } = await loadPlayerProgress(playerId, { timeoutMs: 8000 });
        if (cancelled) return;
        if (isSavedGameProgress(progress)) {
          applyServerProgressAndNotices(progress);
        }
      } catch {
        // Server progress is best-effort for now; local starter state remains available.
      } finally {
        if (!cancelled) setProgressHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyServerProgressAndNotices, playerId]);

  useEffect(() => {
    if (!playerId || !progressHydrated) return;
    const t = window.setInterval(() => {
      void (async () => {
        try {
          const { progress } = await loadPlayerProgress(playerId, { timeoutMs: 6000 });
          if (!isSavedGameProgress(progress)) return;
          const notices = (progress as SavedGameProgress).clientNotices;
          if (!Array.isArray(notices) || notices.length === 0) return;
          applyServerProgressAndNotices(progress);
        } catch {
          // ignore
        }
      })();
    }, 20000);
    return () => window.clearInterval(t);
  }, [playerId, progressHydrated, applyServerProgressAndNotices]);

  useEffect(() => {
    if (!playerId || !progressHydrated) return;
    const label = screen === 'arena' ? `arena:${arenaSubScreen}` : screen;
    const send = () => {
      void sendPlayerPresenceHeartbeat(playerId, { userName, label }).catch(() => {
        // optional during beta: ignore presence failures
      });
    };
    send();
    const interval = window.setInterval(send, 30_000);
    return () => window.clearInterval(interval);
  }, [playerId, progressHydrated, userName, screen, arenaSubScreen]);

  useEffect(() => {
    if (!playerId || !progressHydrated) return;

    const progress: SavedGameProgress = {
      version: 1,
      userName,
      mainHero,
      currencies: {
        gft: balance,
        crystals,
        coins,
        rating,
        energy,
      },
      pve: {
        currentChapter,
        currentLevel,
      },
      cards: {
        collection,
        shards: cardShards,
        squadIds: cardSquadIds,
      },
      artifacts: {
        items: artifacts,
        equipped: equippedArtifacts,
        materials,
      },
      battlePass: {
        premium: battlePassPremium,
        claimedRewards: claimedBattlePassRewards,
        questProgress: battlePassQuestProgress,
      },
      hold: {
        endTime: holdEndTime,
        lockedGft: holdLockedGft,
        earnings: holdEarnings,
        rewardRate: holdRewardRate,
      },
      dailyReward: {
        claimedDate: dailyRewardClaimedDate,
      },
      savedAt: new Date().toISOString(),
    };

    const timeout = window.setTimeout(() => {
      void savePlayerProgress(playerId, progress).catch(() => {
        // Keep gameplay responsive if the beta API is temporarily unavailable.
      });
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [
    playerId,
    progressHydrated,
    userName,
    mainHero,
    balance,
    crystals,
    coins,
    rating,
    energy,
    currentChapter,
    currentLevel,
    collection,
    cardShards,
    cardSquadIds,
    artifacts,
    equippedArtifacts,
    materials,
    battlePassPremium,
    claimedBattlePassRewards,
    battlePassQuestProgress,
    holdEndTime,
    holdLockedGft,
    holdEarnings,
    holdRewardRate,
    dailyRewardClaimedDate,
  ]);

  const ownedCards = CHARACTER_CARDS.filter(card => (collection[card.id] ?? 0) > 0);
  const selectedCardSquad = cardSquadIds
    .map(id => CHARACTER_CARDS.find(card => card.id === id))
    .filter((card): card is CharacterCard => {
      if (!card) return false;
      return (collection[card.id] ?? 0) > 0;
    })
    .slice(0, 3);
  const activeCardSquad = selectedCardSquad.length > 0 ? selectedCardSquad : ownedCards.slice(0, 3);

  const getLeaderBonus = () => {
    if (!mainHero) return { hpMultiplier: 1, powerMultiplier: 1, unlockLevel: 1 };
    return {
      hpMultiplier: 1 + mainHero.level * 0.025 + mainHero.stars * 0.04,
      powerMultiplier: 1 + mainHero.level * 0.018 + mainHero.stars * 0.035,
      unlockLevel: mainHero.level,
    };
  };

  const getBuffedCardStats = (card: CharacterCard) => {
    const leader = getLeaderBonus();
    return {
      hp: Math.floor(card.hp * leader.hpMultiplier),
      power: Math.floor(card.power * leader.powerMultiplier),
    };
  };

  const toggleCardInSquad = (cardId: string) => {
    if (cardSquadIds.includes(cardId)) {
      setCardSquadIds(prev => prev.filter(id => id !== cardId));
      return;
    }
    if (cardSquadIds.length >= 3) {
      alert('В отряде максимум 3 карты.');
      return;
    }
    setCardSquadIds(prev => [...prev, cardId]);
  };

  const addCardsToCollection = (results: ReturnType<typeof openCardPack>) => {
    setCollection(prev => {
      const next = { ...prev };
      for (const result of results) {
        next[result.card.id] = (next[result.card.id] ?? 0) + 1;
      }
      return next;
    });
    setCardShards(prev => prev + results.reduce((sum, result) => sum + result.shards, 0));
  };

  const openCharacterPack = async (packType: CardPackType) => {
    const pack = CARD_PACKS[packType];
    if (blockIfNoPlayerId()) return;

    try {
      const result = await openPlayerCardPack(playerId, packType, 'default');
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      advanceBattlePassQuest('card_pack_open');
      const summary = result.pack.results
        .map(card => `${card.isDuplicate ? 'дубликат ' : ''}${card.name} (${card.rarity})${card.shards ? ` +${card.shards} осколков` : ''}`)
        .join('\n');
      alert(`🎴 ${pack.name} открыт!\n${summary}`);
    } catch {
      alert('Не удалось открыть набор. Проверь баланс и доступность сервера.');
    }
  };

  const openPremiumCharacterPack = async (packType: CardPackType) => {
    if (blockIfNoPlayerId()) return;

    try {
      const result = await openPlayerCardPack(playerId, packType, 'gft');
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      advanceBattlePassQuest('card_pack_open');
      const bestResult = [...result.pack.results].sort((a, b) => (CARD_RARITY_ORDER[b.rarity as CardRarity] ?? 0) - (CARD_RARITY_ORDER[a.rarity as CardRarity] ?? 0))[0];
      const bestCard = CHARACTER_CARDS.find(card => card.id === bestResult?.cardId);
      if (bestCard) setReceivedCard(bestCard);
    } catch {
      alert('Не удалось купить премиальный набор. Проверь GFT и доступность сервера.');
    }
  };

  const battlePassXp = BATTLEPASS_QUESTS.reduce((sum, quest) => {
    if (quest.track === 'paid' && !battlePassPremium) return sum;
    const progress = Math.min(battlePassQuestProgress[quest.id] ?? 0, quest.target);
    return sum + progress * quest.xpPerStep;
  }, 0);
  const currentBattlePassLevel = Math.min(BATTLEPASS_TIERS.length, Math.floor(battlePassXp / BATTLEPASS_XP_PER_LEVEL) + 1);
  const currentBattlePassLevelXp = battlePassXp % BATTLEPASS_XP_PER_LEVEL;

  const homeBpCurrentFreeQuest =
    BATTLEPASS_QUESTS.find(q => {
      if (q.track === 'paid') return false;
      const p = Math.min(battlePassQuestProgress[q.id] ?? 0, q.target);
      return p < q.target;
    }) ?? null;
  const homeBpPremiumQuest = BATTLEPASS_QUESTS.find(q => q.track === 'paid') ?? null;

  const advanceBattlePassQuest = (questId: BattlePassQuestKind, amount = 1) => {
    const quest = BATTLEPASS_QUESTS.find(item => item.id === questId);
    if (!quest) return;
    if (quest.track === 'paid' && !battlePassPremium) return;
    setBattlePassQuestProgress(prev => {
      const current = prev[questId] ?? 0;
      if (current >= quest.target) return prev;
      return { ...prev, [questId]: Math.min(quest.target, current + amount) };
    });
  };

  const finishOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    } catch {
      // ignore
    }
    setOnboardingStep(null);
    setBattlePassQuestProgress(prev => {
      const quest = BATTLEPASS_QUESTS.find(item => item.id === 'onboarding');
      if (!quest) return prev;
      if (quest.track === 'paid' && !battlePassPremium) return prev;
      const current = prev.onboarding ?? 0;
      if (current >= quest.target) return prev;
      return { ...prev, onboarding: Math.min(quest.target, current + 1) };
    });
  };

  const isBattlePassRewardClaimed = (tier: number, track: 'free' | 'paid') =>
    claimedBattlePassRewards.includes(`${track}-${tier}`);

  const grantBattlePassReward = (reward: BattlePassReward) => {
    if (reward.coins) earnCoins(reward.coins);
    if (reward.crystals) earnCrystals(reward.crystals);
    if (reward.materials) {
      const materialsReward = reward.materials;
      setMaterials(prev => prev + materialsReward);
    }
    if (reward.shards) {
      const shardsReward = reward.shards;
      setCardShards(prev => prev + shardsReward);
    }
    if (reward.cardPack) {
      const results = openCardPack(reward.cardPack, collection);
      addCardsToCollection(results);
      advanceBattlePassQuest('card_pack_open');
      const bestCard = [...results].sort((a, b) => CARD_RARITY_ORDER[b.card.rarity] - CARD_RARITY_ORDER[a.card.rarity])[0]?.card;
      if (bestCard) setReceivedCard(bestCard);
    }
    if (reward.artifact) {
      const type = reward.artifact.type ?? randomItem(ARTIFACT_TYPES);
      const artifact = createArtifact(type, 'battlepass', reward.artifact.rarity);
      setArtifacts(prev => [...prev, artifact]);
      setReceivedArtifact({ artifact, source: 'battlepass', subtitle: 'Награда батлпасса' });
    }
  };

  const claimBattlePassReward = (tier: BattlePassTier, track: 'free' | 'paid') => {
    if (tier.level > currentBattlePassLevel) return;
    if (track === 'paid' && !battlePassPremium) return;
    if (isBattlePassRewardClaimed(tier.level, track)) return;

    grantBattlePassReward(tier[track]);
    setClaimedBattlePassRewards(prev => [...prev, `${track}-${tier.level}`]);
  };

  const buyBattlePassPremium = () => {
    if (battlePassPremium) return;
    if (!spendGFT(BATTLEPASS_PRICE_GFT)) return;
    setBattlePassPremium(true);
    alert('✅ Премиум батлпасс открыт. Платные награды можно забирать на уже открытых уровнях.');
  };

  const craftCharacterCard = (card: CharacterCard) => {
    if ((collection[card.id] ?? 0) > 0) {
      alert('Эта карта уже есть в коллекции.');
      return;
    }

    const cost = CARD_CRAFT_COST[card.rarity];
    if (cardShards < cost) {
      alert(`Недостаточно осколков! Нужно ${cost}, есть ${cardShards}`);
      return;
    }

    setCardShards(prev => prev - cost);
    setCollection(prev => ({ ...prev, [card.id]: 1 }));
    setReceivedCard(card);
  };

  const selectExchangeRarity = (rarity: CardRarity) => {
    setSelectedExchangeRarity(rarity);
    setSelectedExchangeCardIds([]);
  };

  const toggleExchangeCard = (card: CharacterCard) => {
    if (card.rarity !== selectedExchangeRarity) {
      selectExchangeRarity(card.rarity);
      setSelectedExchangeCardIds([card.id]);
      return;
    }

    const selectedCount = selectedExchangeCardIds.filter(id => id === card.id).length;
    const ownedCount = collection[card.id] ?? 0;
    if (selectedCount > 0) {
      setSelectedExchangeCardIds(prev => {
        const index = prev.indexOf(card.id);
        return index >= 0 ? [...prev.slice(0, index), ...prev.slice(index + 1)] : prev;
      });
      return;
    }
    if (selectedExchangeCardIds.length >= CARD_RARITY_UPGRADE_COST) {
      alert(`Можно выбрать только ${CARD_RARITY_UPGRADE_COST} карт.`);
      return;
    }
    if (selectedCount >= ownedCount) return;
    setSelectedExchangeCardIds(prev => [...prev, card.id]);
  };

  const addExchangeCopy = (card: CharacterCard) => {
    const selectedCount = selectedExchangeCardIds.filter(id => id === card.id).length;
    const ownedCount = collection[card.id] ?? 0;
    if (selectedExchangeCardIds.length >= CARD_RARITY_UPGRADE_COST || selectedCount >= ownedCount) return;
    setSelectedExchangeCardIds(prev => [...prev, card.id]);
  };

  const removeExchangeCopy = (cardId: string) => {
    setSelectedExchangeCardIds(prev => {
      const index = prev.indexOf(cardId);
      return index >= 0 ? [...prev.slice(0, index), ...prev.slice(index + 1)] : prev;
    });
  };

  const upgradeSelectedCardsByRarity = () => {
    const sourceRarity = selectedExchangeRarity;
    const targetRarity = CARD_RARITY_UPGRADE_TARGET[sourceRarity];
    const consumedCards = selectedExchangeCardIds
      .map(cardId => CHARACTER_CARDS.find(card => card.id === cardId))
      .filter((card): card is CharacterCard => Boolean(card));

    if (!targetRarity || consumedCards.length < CARD_RARITY_UPGRADE_COST) {
      alert(`Выбери ${CARD_RARITY_UPGRADE_COST} карт редкости ${sourceRarity}.`);
      return;
    }
    if (consumedCards.some(card => card.rarity !== sourceRarity)) {
      alert('Все выбранные карты должны быть одной редкости.');
      return;
    }
    const selectedCounts = selectedExchangeCardIds.reduce<Record<string, number>>((acc, cardId) => {
      acc[cardId] = (acc[cardId] ?? 0) + 1;
      return acc;
    }, {});
    if (Object.entries(selectedCounts).some(([cardId, count]) => count > (collection[cardId] ?? 0))) {
      alert('Выбрано больше копий, чем есть в коллекции.');
      return;
    }

    const reward = rollRarityUpgradeReward(sourceRarity);
    if (!reward) return;

    setCollection(prev => {
      const next = { ...prev };
      for (const card of consumedCards) {
        const count = next[card.id] ?? 0;
        if (count <= 1) {
          delete next[card.id];
        } else {
          next[card.id] = count - 1;
        }
      }
      next[reward.id] = (next[reward.id] ?? 0) + 1;
      return next;
    });

    setCardSquadIds(prev => prev.filter(cardId => {
      const consumedCount = consumedCards.filter(card => card.id === cardId).length;
      return consumedCount < (collection[cardId] ?? 0);
    }));

    setSelectedExchangeCardIds([]);
    setReceivedCard(reward);
  };

  const toCardFighter = (card: CharacterCard, side: 'player' | 'bot', idx: number, statMultiplier = 1): CardFighter => {
    const baseStats = side === 'player' ? getBuffedCardStats(card) : { hp: Math.floor(card.hp * 0.95), power: card.power };
    const buffed = {
      hp: Math.max(1, Math.floor(baseStats.hp * statMultiplier)),
      power: Math.max(1, Math.floor(baseStats.power * statMultiplier)),
    };
    return {
      uid: createCardUid(side, card.id, idx),
      name: card.name,
      role: `${card.element} • ${card.kind}`,
      emoji: side === 'player' ? '🟦' : '🟥',
      image: getCharacterCardImageUrl(card.id),
      rarity: card.rarity,
      maxHP: buffed.hp,
      hp: buffed.hp,
      power: buffed.power,
      speed: card.speed,
      abilities: {
        basic: card.abilities[0],
        skill: card.abilities[1],
      },
      cooldowns: { basic: 0, skill: 0 },
      shield: 0,
      stunnedTurns: 0,
      dotDamage: 0,
      dotTurns: 0,
    };
  };

  const getAlive = (team: CardFighter[]) => team.filter(c => c.hp > 0);
  const getFighterSide = (uid: string | null, playerTeam: CardFighter[], botTeam: CardFighter[]): Exclude<CardBattleTurn, 'ended'> | null => {
    if (!uid) return null;
    if (playerTeam.some(c => c.uid === uid)) return 'player';
    if (botTeam.some(c => c.uid === uid)) return 'bot';
    return null;
  };
  const getFighterByUid = (uid: string | null, playerTeam: CardFighter[], botTeam: CardFighter[]) => {
    if (!uid) return undefined;
    return [...playerTeam, ...botTeam].find(c => c.uid === uid);
  };
  const createTurnOrder = (playerTeam: CardFighter[], botTeam: CardFighter[]) =>
    [...playerTeam, ...botTeam]
      .sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        return b.power - a.power;
      })
      .map(c => c.uid);
  const getLowestHpAlly = (team: CardFighter[]) =>
    getAlive(team).sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];

  const applyDamageToFighter = (target: CardFighter, amount: number) => {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    target.hp = Math.max(0, target.hp - (amount - absorbed));
    return absorbed;
  };

  const decCooldowns = (team: CardFighter[], actedUid: string) =>
    team.map(c => ({
      ...c,
      cooldowns: c.uid === actedUid
        ? {
            basic: Math.max(0, c.cooldowns.basic - 1),
            skill: Math.max(0, c.cooldowns.skill - 1),
          }
        : c.cooldowns,
    }));

  const tickDots = (team: CardFighter[], log: string[]) => {
    for (const fighter of team) {
      if (fighter.hp <= 0 || fighter.dotTurns <= 0) continue;
      const damage = fighter.dotDamage;
      const absorbed = applyDamageToFighter(fighter, damage);
      fighter.dotTurns -= 1;
      if (fighter.dotTurns <= 0) fighter.dotDamage = 0;
      log.push(`☠️ ${fighter.name} получает ${damage} периодического урона${absorbed > 0 ? `, щит поглотил ${absorbed}` : ''}.`);
    }
  };

  const showBattleVfx = (effect: Omit<BattleVfx, 'id'>) => {
    setBattleVfx({ ...effect, id: getTimestamp() });
  };

  const startCardBattle = async (
    opponent: { id: number; name: string; emoji: string; power: number; maxHP: number },
    mode: CardBattleState['mode'] = 'pvp',
    pveContext?: CardBattleState['pveContext'],
    battleOpts?: { isTrainingPve?: boolean; pvpOpponentRating?: number },
  ) => {
    if (!mainHero) return;
    if (blockIfNoPlayerId()) return;
    if (activeCardSquad.length === 0) {
      alert('Сначала выбери карты в отряд.');
      setScreen('team');
      setTeamTab('cards');
      return;
    }

    const isTrainingPve = Boolean(battleOpts?.isTrainingPve);
    const sessionPveContext =
      pveContext == null
        ? undefined
        : isTrainingPve
          ? { ...pveContext, isTraining: true as const }
          : pveContext;

    let sessionId: string;
    try {
      const { session } = await startPlayerBattleSession(playerId, {
        mode,
        opponent: { id: opponent.id, name: opponent.name },
        pveContext: sessionPveContext,
      });
      sessionId = session.id;
    } catch {
      alert('Не удалось создать серверную сессию боя. Проверь backend и попробуй ещё раз.');
      return;
    }

    advanceBattlePassQuest(mode === 'pve' ? 'pve_start' : 'pvp_start');
    const playerTeam = activeCardSquad.map((card, i) => toCardFighter(card, 'player', i));

    const commonTrainPool = CHARACTER_CARDS.filter(c => c.rarity === 'Common');
    const pvpOppR = battleOpts?.pvpOpponentRating;
    const pvpRDiff = mode === 'pvp' && pvpOppR != null ? pvpOppR - rating : 0;
    const pvpBotMult =
      mode === 'pvp' && pvpOppR != null ? 1 + Math.max(-0.5, Math.min(0.5, pvpRDiff * 0.0008)) : null;
    const botMultiplier = isTrainingPve
      ? 0.42
      : mode === 'pve' && pveContext
        ? 1 + pveContext.chapter * 0.08 + pveContext.level * 0.05 + (pveContext.isBoss ? 0.28 : 0)
        : pvpBotMult != null
          ? pvpBotMult
          : 1;
    const botPicks = isTrainingPve
      ? Array.from({ length: 3 }, () => randomItem(commonTrainPool.length ? commonTrainPool : CHARACTER_CARDS))
      : Array.from({ length: 3 }, () => randomItem(CHARACTER_CARDS));
    const botTeam = botPicks.map((card, i) => toCardFighter(card, 'bot', i, botMultiplier));
    const turnOrder = createTurnOrder(playerTeam, botTeam);
    const activeFighterUid = turnOrder[0] ?? null;
    const firstTurn = getFighterSide(activeFighterUid, playerTeam, botTeam) ?? 'player';

    const trainingLogPrefix = isTrainingPve
      ? '🎓 Обучающий PVE: слабый вражеский отряд, награда идёт в профиль, по главам кампания не сдвигается.'
      : null;
    setCardBattle({
      sessionId,
      opponent,
      mode,
      pveContext: sessionPveContext,
      isTrainingPve,
      turn: firstTurn,
      round: 1,
      playerTeam,
      botTeam,
      turnOrder,
      activeFighterUid,
      selectedAttackerUid: firstTurn === 'player' ? activeFighterUid : playerTeam[0]?.uid ?? null,
      selectedTargetUid: botTeam[0]?.uid ?? null,
      selectedAllyUid: playerTeam[0]?.uid ?? null,
      auto: false,
      log: [
        ...(trainingLogPrefix ? [trainingLogPrefix] : []),
        `🃏 ${mode === 'pve' ? 'PVE' : 'PVP'} бой 3×3 против ${opponent.name}`,
        `⏱ Первый ход: ${getFighterByUid(activeFighterUid, playerTeam, botTeam)?.name ?? 'неизвестно'}`,
      ],
    });
  };

  const endCardBattle = async (result: 'win' | 'lose') => {
    const finishedBattle = cardBattle;
    setCardBattle(prev => {
      if (!prev) return null;
      const newLog = [...prev.log, result === 'win' ? '🏆 Победа!' : '💥 Поражение.'];
      return { ...prev, turn: 'ended', auto: false, log: newLog };
    });

    if (!finishedBattle || !playerId) {
      setBattleRewardModal({
        result,
        title: result === 'win' ? 'Бой завершён' : 'Бой проигран',
        subtitle: 'Серверный профиль ещё не готов, награда не начислена.',
        rewards: [],
      });
      return;
    }

    if (result === 'win' && finishedBattle.isTrainingPve) {
      advanceBattlePassQuest('pve_training');
    }
    if (result === 'win' && finishedBattle.mode === 'pvp' && battlePassPremium) {
      advanceBattlePassQuest('premium_elite');
    }

    try {
      const response = await claimPlayerBattleReward(playerId, {
        sessionId: finishedBattle.sessionId,
        mode: finishedBattle.mode,
        result,
        account: xrplAccount,
        pveContext: finishedBattle.pveContext,
        materialFind: artifactStats.materialFind,
      });
      if (isSavedGameProgress(response.progress)) applySavedProgress(response.progress);

      if (
        result === 'win' &&
        finishedBattle.mode === 'pve' &&
        finishedBattle.pveContext &&
        !finishedBattle.pveContext.isTraining
      ) {
        const { chapter, isBoss } = finishedBattle.pveContext;
        const dropChance = isBoss ? 1 : 0.25;
        // roll runs in async handler after battle, not during render
        // eslint-disable-next-line react-hooks/purity -- not in render
        if (Math.random() < dropChance) {
          const artifact = createPveArtifact(chapter, isBoss);
          setArtifacts(prev => [...prev, artifact]);
          setReceivedArtifact({
            artifact,
            source: 'pve',
            subtitle: isBoss ? `Босс главы ${chapter} оставил трофей` : `Дроп с PvE боя • глава ${chapter}`,
          });
        }
      }

      setBattleRewardModal(response.rewardModal);
    } catch {
      setBattleRewardModal({
        result,
        title: 'Сервер не подтвердил награду',
        subtitle: 'Бой завершён, но экономика не изменилась. Проверь backend и попробуй снова.',
        rewards: [],
      });
    }
  };

  const applyCardAction = (
    ability: CardAbilityKey,
    attackerSide: 'player' | 'bot',
    targetUid: string | null,
    allyTargetUid?: string | null
  ) => {
    setCardBattle(prev => {
      if (!prev) return prev;
      if (prev.turn === 'ended') return prev;
      if (attackerSide === 'player' && prev.turn !== 'player') return prev;
      if (attackerSide === 'bot' && prev.turn !== 'bot') return prev;
      if (getFighterSide(prev.activeFighterUid, prev.playerTeam, prev.botTeam) !== attackerSide) return prev;

      const playerTeam = prev.playerTeam.map(c => ({ ...c, cooldowns: { ...c.cooldowns } }));
      const botTeam = prev.botTeam.map(c => ({ ...c, cooldowns: { ...c.cooldowns } }));

      const atkTeam = attackerSide === 'player' ? playerTeam : botTeam;
      const defTeam = attackerSide === 'player' ? botTeam : playerTeam;

      const attacker = atkTeam.find(c => c.uid === prev.activeFighterUid && c.hp > 0);
      if (!attacker) return prev;

      const newLog = [...prev.log];

      if (attacker.stunnedTurns > 0) {
        attacker.stunnedTurns -= 1;
        newLog.push(`💫 ${attacker.emoji} ${attacker.name} пропускает ход из-за оглушения.`);
      } else {
        const abilityData = attacker.abilities[ability];
        if (ability === 'skill' && attacker.cooldowns.skill > 0) return prev;

        const target = targetUid ? defTeam.find(c => c.uid === targetUid && c.hp > 0) : defTeam.find(c => c.hp > 0);
        const effectValue = Math.max(1, Math.floor(attacker.power * abilityData.power * randomRange(0.9, 0.25)));

        if (abilityData.kind === 'heal') {
          const ally = allyTargetUid ? atkTeam.find(c => c.uid === allyTargetUid && c.hp > 0) : getLowestHpAlly(atkTeam);
          if (!ally) return prev;
          const before = ally.hp;
          ally.hp = Math.min(ally.maxHP, ally.hp + effectValue);
          queueMicrotask(() => showBattleVfx({ kind: abilityData.kind, title: abilityData.name, attackerName: attacker.name, targetName: ally.name, side: attackerSide }));
          newLog.push(`💚 ${attacker.name}: ${abilityData.name} восстанавливает ${ally.name} +${ally.hp - before} HP.`);
        } else if (abilityData.kind === 'shield') {
          const ally = allyTargetUid ? atkTeam.find(c => c.uid === allyTargetUid && c.hp > 0) : getLowestHpAlly(atkTeam);
          if (!ally) return prev;
          ally.shield += effectValue;
          queueMicrotask(() => showBattleVfx({ kind: abilityData.kind, title: abilityData.name, attackerName: attacker.name, targetName: ally.name, side: attackerSide }));
          newLog.push(`🛡️ ${attacker.name}: ${abilityData.name} даёт ${ally.name} щит ${effectValue}.`);
        } else {
          if (!target) return prev;
          const damage = abilityData.kind === 'dot' ? Math.max(1, Math.floor(effectValue * 0.7)) : effectValue;
          const absorbed = applyDamageToFighter(target, damage);
          let suffix = absorbed > 0 ? `, щит поглотил ${absorbed}` : '';
          if (abilityData.kind === 'dot') {
            target.dotDamage = Math.max(target.dotDamage, Math.max(1, Math.floor(effectValue * 0.35)));
            target.dotTurns = Math.max(target.dotTurns, 2);
            suffix += `, наложен периодический урон`;
          }
          if (abilityData.kind === 'stun') {
            target.stunnedTurns = Math.max(target.stunnedTurns, 1);
            suffix += `, цель оглушена`;
          }
          queueMicrotask(() => showBattleVfx({ kind: abilityData.kind, title: abilityData.name, attackerName: attacker.name, targetName: target.name, side: attackerSide }));
          newLog.push(`${attackerSide === 'player' ? '🟦' : '🟥'} ${attacker.name}: ${abilityData.name} → ${target.name}: -${damage} HP${suffix}.`);
        }

        if (ability === 'skill') attacker.cooldowns.skill = abilityData.cooldownTurns;
      }

      const newPlayerTeam = attackerSide === 'player' ? atkTeam : defTeam;
      const newBotTeam = attackerSide === 'player' ? defTeam : atkTeam;
      tickDots(newPlayerTeam, newLog);
      tickDots(newBotTeam, newLog);

      const pAlive = getAlive(newPlayerTeam).length;
      const bAlive = getAlive(newBotTeam).length;
      const playerTeamWithCooldowns = decCooldowns(newPlayerTeam, attacker.uid);
      const botTeamWithCooldowns = decCooldowns(newBotTeam, attacker.uid);
      if (bAlive === 0) {
        queueMicrotask(() => endCardBattle('win'));
        return { ...prev, playerTeam: playerTeamWithCooldowns, botTeam: botTeamWithCooldowns, log: newLog, auto: false };
      }
      if (pAlive === 0) {
        queueMicrotask(() => endCardBattle('lose'));
        return { ...prev, playerTeam: playerTeamWithCooldowns, botTeam: botTeamWithCooldowns, log: newLog, auto: false };
      }

      const aliveOrder = prev.turnOrder.filter(uid => {
        const fighter = getFighterByUid(uid, playerTeamWithCooldowns, botTeamWithCooldowns);
        return Boolean(fighter && fighter.hp > 0);
      });
      const currentIndex = aliveOrder.indexOf(attacker.uid);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % aliveOrder.length : 0;
      const nextActiveUid = aliveOrder[nextIndex] ?? null;
      const nextTurn = getFighterSide(nextActiveUid, playerTeamWithCooldowns, botTeamWithCooldowns) ?? 'player';
      const nextRound = currentIndex >= 0 && nextIndex <= currentIndex ? prev.round + 1 : prev.round;
      const nextSelected = nextTurn === 'player'
        ? getAlive(botTeamWithCooldowns)[0]?.uid ?? null
        : prev.selectedTargetUid;
      const nextAttacker = nextTurn === 'player'
        ? nextActiveUid
        : getAlive(playerTeamWithCooldowns).find(c => c.uid === prev.selectedAttackerUid)?.uid ?? getAlive(playerTeamWithCooldowns)[0]?.uid ?? null;
      const nextAlly = nextTurn === 'player'
        ? getAlive(playerTeamWithCooldowns).find(c => c.uid === prev.selectedAllyUid)?.uid ?? nextAttacker
        : prev.selectedAllyUid;
      const nextFighter = getFighterByUid(nextActiveUid, playerTeamWithCooldowns, botTeamWithCooldowns);
      if (nextFighter) {
        newLog.push(`➡️ Ход переходит к ${nextTurn === 'player' ? 'твоему' : 'вражескому'} бойцу: ${nextFighter.name}.`);
      }

      return {
        ...prev,
        playerTeam: playerTeamWithCooldowns,
        botTeam: botTeamWithCooldowns,
        turn: nextTurn,
        round: nextRound,
        activeFighterUid: nextActiveUid,
        selectedAttackerUid: nextAttacker,
        selectedTargetUid: nextSelected,
        selectedAllyUid: nextAlly,
        log: newLog,
      };
    });
  };

  // Автобой игрока + ход бота
  useEffect(() => {
    if (!cardBattle) return;
    if (cardBattle.turn === 'ended') return;

    if (cardBattle.turn === 'bot') {
      const t = setTimeout(() => {
        const botAttacker = cardBattle.botTeam.find(c => c.uid === cardBattle.activeFighterUid && c.hp > 0);
        const target = cardBattle.playerTeam.filter(c => c.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        const ally = cardBattle.botTeam.filter(c => c.hp > 0).sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];
        if (!botAttacker || !target) return;
        const ability: CardAbilityKey = rollBotAbility(botAttacker.cooldowns.skill === 0);
        applyCardAction(ability, 'bot', target.uid, ally?.uid ?? botAttacker.uid);
      }, 700);
      return () => clearTimeout(t);
    }

    if (cardBattle.turn === 'player' && cardBattle.auto) {
      const t = setTimeout(() => {
        const attacker = cardBattle.playerTeam.find(c => c.uid === cardBattle.activeFighterUid && c.hp > 0);
        const target = cardBattle.botTeam.filter(c => c.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if (!attacker || !target) return;
        const ability: CardAbilityKey = attacker.cooldowns.skill === 0 ? 'skill' : 'basic';
        applyCardAction(ability, 'player', target.uid, cardBattle.selectedAllyUid);
      }, 550);
      return () => clearTimeout(t);
    }
  // Timed bot/auto turns should be driven by battle state changes, not by callback identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle]);

  const selectMainHero = (hero: SquadHero) => {
    const newHero = { ...hero, exp: 0, stars: 1, level: 1 };
    setMainHero(newHero);
    setCardSquadIds(prev => (prev.length > 0 ? prev : CHARACTER_CARDS.slice(0, 3).map(card => card.id)));
    setGamePhase('playing');
  };

  const getBackground = () => {
    const map: Record<Screen, string> = {
      home: '/images/backgrounds/home-bg.png',
      arena: '/images/backgrounds/arena-bg.png',
      team: '/images/backgrounds/team-bg.png',
      farm: '/images/backgrounds/farm-bg.png',
      shop: '/images/backgrounds/home-bg.png',
      levelup: '/images/backgrounds/progression-bg.png',
      artifacts: '/images/backgrounds/home-bg.png',
      craft: '/images/backgrounds/progression-bg.png',
      battlepass: '/images/backgrounds/progression-bg.png',
    };
    return map[screen] || '/images/backgrounds/home-bg.png';
  };

  const startHold = async () => {
    const amount = Math.floor(Number(holdAmountInput));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Введите сумму GFT для HOLD.');
      return;
    }
    if (blockIfNoPlayerId()) return;
    if (amount > balance) {
      alert(`Недостаточно GFT! Доступно ${balance}, нужно ${amount}`);
      return;
    }

    setHoldBusy(true);
    try {
      const result = await startPlayerHold(playerId, amount, xrplAccount);
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      else {
        setBalance(b => b - amount);
        setHoldLockedGft(result.hold.lockedGft);
        setHoldEndTime(result.hold.endTime);
        setHoldEarnings(result.hold.earnings);
        setHoldRewardRate(result.hold.rewardRate ?? HOLD_REWARD_RATE * (1 + nftBonuses.holdRewardBonus));
      }
      setNow(getTimestamp());
      advanceBattlePassQuest('hold_start');
    } catch {
      alert('Не удалось запустить HOLD. Проверь баланс, активный HOLD и доступность сервера.');
    } finally {
      setHoldBusy(false);
    }
  };

  const finishHoldReward = useCallback(async () => {
    if (!playerId || holdBusy) return;
    setHoldBusy(true);
    try {
      const result = await claimPlayerHold(playerId);
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      else {
        setBalance(b => b + result.reward.totalGft);
        setHoldEndTime(null);
        setHoldLockedGft(0);
        setHoldEarnings(0);
        setHoldRewardRate(HOLD_REWARD_RATE);
      }
      alert(`HOLD завершён! Возвращено ${result.reward.lockedGft.toFixed(2)} GFT и начислено +${result.reward.rewardGft.toFixed(2)} GFT`);
    } catch {
      alert('HOLD завершён, но сервер не подтвердил награду. Попробуй обновить экран или проверить сервер.');
    } finally {
      setHoldBusy(false);
    }
  }, [applySavedProgress, holdBusy, playerId]);

  useEffect(() => {
    if (!holdEndTime) return;
    const interval = setInterval(() => {
      const currentTime = getTimestamp();
      setNow(currentTime);
      const elapsed = Math.max(0, Math.min(HOLD_DURATION_MS, HOLD_DURATION_MS - Math.max(0, holdEndTime - currentTime)));
      const currentReward = holdLockedGft * holdRewardRate * (elapsed / HOLD_DURATION_MS);
      if (currentTime >= holdEndTime) {
        void finishHoldReward();
        return;
      }
      setHoldEarnings(currentReward);
    }, 1000);
    return () => clearInterval(interval);
  }, [finishHoldReward, holdEndTime, holdLockedGft, holdRewardRate]);

  // Функции валют
  const buyCrystalsWithGFT = (crystalAmount: number, gftCost: number) => {
    if (!spendGFT(gftCost)) return;
    setCrystals(c => c + crystalAmount);
    alert(`💎 Куплено ${crystalAmount} кристаллов за ${gftCost} GFT`);
  };

  const buyCoinsWithGFT = (coinAmount: number, gftCost: number) => {
    if (!spendGFT(gftCost)) return;
    earnCoins(coinAmount);
    alert(`🪙 Куплено ${coinAmount} монет за ${gftCost} GFT`);
  };

  const buyCoinsWithCrystals = (coinAmount: number, crystalCost: number) => {
    if (!spendCrystals(crystalCost)) return;
    earnCoins(coinAmount);
    alert(`🪙 Куплено ${coinAmount} монет за ${crystalCost} кристаллов`);
  };

  function spendGFT(amount: number): boolean {
    if (balance >= amount) {
      setBalance(b => b - amount);
      return true;
    }
    alert(`Недостаточно GFT! Нужно ${amount}, есть ${balance}`);
    return false;
  }

  function spendCrystals(amount: number): boolean {
    if (crystals >= amount) {
      setCrystals(c => c - amount);
      return true;
    }
    alert(`Недостаточно кристаллов! Нужно ${amount}, есть ${crystals}`);
    return false;
  }

  function spendCoins(amount: number): boolean {
    if (coins >= amount) {
      setCoins(c => c - amount);
      return true;
    }
    alert(`Недостаточно монет! Нужно ${amount}, есть ${coins}`);
    return false;
  }

  // Восстановление энергии
  useEffect(() => {
    if (energy >= maxEnergy) return;
    const interval = setInterval(() => {
      setEnergy(e => Math.min(maxEnergy, e + 1));
    }, 300000); // Восстановление 1 энергии каждые 5 минут
    return () => clearInterval(interval);
  }, [energy, maxEnergy]);

  // Функции артефактов
  const equipArtifact = (artifact: Artifact) => {
    setEquippedArtifacts(prev => equipArtifactInSlot(prev, artifact));
  };

  const unequipArtifact = (slot: string) => {
    setEquippedArtifacts(prev => unequipArtifactInSlot(prev, slot));
  };

  const upgradeArtifact = (artifactId: string) => {
    const artifact = artifacts.find(a => a.id === artifactId);
    if (!artifact) return;
    if (artifact.level >= artifact.maxLevel) {
      alert('Артефакт уже на максимальном уровне.');
      return;
    }

    const upgradeCost = getUpgradeCost(artifact.level, artifact.rarity);
    if (crystals < upgradeCost.gft || materials < upgradeCost.materials) {
      alert(`Нужно: ${upgradeCost.gft} кристаллов и ${upgradeCost.materials} материалов`);
      return;
    }

    const upgradedArtifact = upgradeArtifactLevel(artifact);
    setArtifacts(prev => prev.map(a => (a.id === artifactId ? upgradedArtifact : a)));
    setSelectedArtifact(prev => (prev?.id === artifactId ? upgradedArtifact : prev));
    setCrystals(c => c - upgradeCost.gft);
    setMaterials(m => m - upgradeCost.materials);
    alert(`✅ Артефакт улучшен до уровня ${artifact.level + 1}!`);
  };

  const craftArtifact = (type: ArtifactType) => {
    const cost = CRAFT_RECIPES[type].cost;
    if (crystals < cost.gft || materials < cost.materials) {
      alert(`Нужно: ${cost.gft} кристаллов и ${cost.materials} материалов`);
      return;
    }

    const newArtifact = createArtifact(type, 'craft');

    setArtifacts(prev => [...prev, newArtifact]);
    setCrystals(c => c - cost.gft);
    setMaterials(m => m - cost.materials);
    alert(`🎉 Создан артефакт: ${newArtifact.name} (${newArtifact.rarity}, качество ${newArtifact.quality})!`);
  };

  const dismantleArtifact = (artifact: Artifact) => {
    if (artifact.locked) {
      alert('Заблокированный артефакт нельзя разобрать.');
      return;
    }
    if (isArtifactEquipped(artifact.id, equippedArtifacts)) {
      alert('Сначала сними артефакт с экипировки.');
      return;
    }

    const reward = getDismantleReward(artifact);
    setArtifacts(prev => prev.filter(a => a.id !== artifact.id));
    setMaterials(m => m + reward.materials);
    setCrystals(c => c + reward.gft);
    setSelectedArtifact(null);
    alert(`Разбор: +${reward.materials} материалов, +${reward.gft} кристаллов`);
  };

  const toggleArtifactLock = (artifactId: string) => {
    setArtifacts(prev => prev.map(a => (a.id === artifactId ? { ...a, locked: !a.locked } : a)));
    setSelectedArtifact(prev => (prev?.id === artifactId ? { ...prev, locked: !prev.locked } : prev));
  };

  const getRequiredHeroLevelForStage = (chapter: number, level: number) => {
    return Math.max(1, chapter + Math.floor((level - 1) / 2));
  };

  const canEnterPveStage = (chapter: number, level: number) => {
    return (mainHero?.level ?? 1) >= getRequiredHeroLevelForStage(chapter, level);
  };

  useEffect(() => {
    if (gamePhase !== 'playing' || screen !== 'arena' || arenaSubScreen !== 'pvp' || !playerId) {
      return;
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPvpOpponentsLoading(true);
      setPvpOpponentsError(false);
      try {
        const data = await fetchPvpOpponents(playerId);
        if (cancelled) return;
        setPvpOpponents(data.opponents);
      } catch {
        if (cancelled) return;
        setPvpOpponents([]);
        setPvpOpponentsError(true);
      } finally {
        if (!cancelled) setPvpOpponentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamePhase, screen, arenaSubScreen, playerId, pvpListRefreshKey]);

  useEffect(() => {
    if (gamePhase !== 'playing' || screen !== 'arena' || arenaSubScreen !== 'ranking') return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setArenaLeaderboardLoading(true);
      setArenaLeaderboardError(false);
      try {
        const r = await fetch(`${API_BASE}/api/arena/leaderboard?period=${encodeURIComponent(arenaRankingPeriod)}`);
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) as {
          entries?: Array<{ place: number; name: string; score: number; wins: number; playerId: string }>;
        };
        if (cancelled) return;
        const entries = (data.entries ?? []).map(e => ({
          place: e.place,
          name: e.name,
          score: e.score,
          wins: e.wins,
          playerId: e.playerId,
        }));
        setArenaLeaderboardEntries(entries);
      } catch {
        if (cancelled) return;
        const period = arenaRankingPeriod;
        const playerScore = period === 'week' ? rating : rating * 4 + Math.floor((mainHero?.level ?? 1) * 65);
        const playerWins = period === 'week' ? Math.max(1, Math.floor((rating - 1000) / 18)) : Math.max(4, Math.floor((rating - 1000) / 5));
        setArenaLeaderboardEntries([
          {
            place: 1,
            name: userName.trim() || 'Ты',
            score: playerScore,
            wins: playerWins,
            ...(playerId ? { playerId } : {}),
          },
        ]);
        setArenaLeaderboardError(true);
      } finally {
        if (!cancelled) setArenaLeaderboardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamePhase, screen, arenaSubScreen, arenaRankingPeriod, rating, mainHero?.level, userName, playerId]);

  const levelUp = (type: 'power' | 'hp' | 'stars') => {
    if (!mainHero) return;
    
    const costs: Record<string, number> = { power: 900, hp: 650, stars: 120 };
    const cost = costs[type];
    
    if (type === 'stars' ? crystals < cost : coins < cost) {
      alert(type === 'stars' ? `Недостаточно кристаллов! Нужно ${cost}, есть ${crystals}` : `Недостаточно монет! Нужно ${cost}, есть ${coins}`);
      return;
    }

    const updatedHero = { ...mainHero };
    
    if (type === 'power') {
      updatedHero.basePower += 5;
    } else if (type === 'hp') {
      updatedHero.level += 1;
    } else if (type === 'stars' && mainHero.stars < 6) {
      updatedHero.stars += 1;
    }
    
    if (type === 'stars') {
      setCrystals(c => c - cost);
    } else {
      setCoins(c => c - cost);
    }
    setMainHero(updatedHero);
    alert(`✅ Прокачка успешна!`);
  };

  const startPveBattle = (chapter: number, level: number) => {
    if (activeCardSquad.length === 0) {
      alert('Сначала выбери карты в отряд.');
      setScreen('team');
      setTeamTab('cards');
      return;
    }
    const requiredLevel = getRequiredHeroLevelForStage(chapter, level);
    if (!canEnterPveStage(chapter, level)) {
      alert(`Нужен уровень героя ${requiredLevel}, чтобы открыть этот этап.`);
      return;
    }
    const isBoss = level === 6; // 5 уровней + босс
    const enemy = generatePveEnemy(chapter, isBoss ? 5 : level, isBoss);
    setCurrentLevel(level);
    startCardBattle(
      {
        id: chapter * 100 + level,
        name: `${isBoss ? 'Босс' : 'Уровень'} ${chapter}-${level}`,
        emoji: enemy.emoji,
        power: enemy.power,
        maxHP: enemy.maxHP,
      },
      'pve',
      { chapter, level, isBoss },
    );
  };

  const startTrainingPveBattle = () => {
    if (activeCardSquad.length === 0) {
      alert('Сначала выбери карты в отряд.');
      setScreen('team');
      setTeamTab('cards');
      return;
    }
    void startCardBattle(
      { id: 0, name: 'Учебный манекен', emoji: '🎓', power: 14, maxHP: 200 },
      'pve',
      { chapter: 1, level: 1, isBoss: false, isTraining: true },
      { isTrainingPve: true },
    );
  };

  const openLootbox = () => {
    if (coins < 1800) {
      alert('Недостаточно монет!');
      return;
    }
    const type = randomItem(ARTIFACT_TYPES);
    const newArtifact = createArtifact(type, 'lootbox');
    setCoins(c => c - 1800);
    setArtifacts(prev => [...prev, newArtifact]);
    setMaterials(m => m + 20);
    alert(`🎁 Лутбокс открыт! ${newArtifact.name} (${newArtifact.rarity}) и +20 материалов.`);
  };

  const bottomNavItems: { screen: Screen; label: string; tile: string; activeColor: string }[] = [
    { screen: 'home', label: 'Главная', tile: '/images/ui/nav-home-bg.png', activeColor: '#a5b4fc' },
    { screen: 'arena', label: 'Арена', tile: '/images/ui/nav-arena-bg.png', activeColor: '#f87171' },
    { screen: 'team', label: 'Отряд', tile: '/images/ui/nav-team-bg.png', activeColor: '#34d399' },
    { screen: 'shop', label: 'Магазин', tile: '/images/ui/nav-shop-bg.png', activeColor: '#facc15' },
  ];

  const brandTextStyle: CSSProperties = {
    fontWeight: 950,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'linear-gradient(180deg, #fff7ad 0%, #facc15 42%, #f97316 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 24px rgba(234,179,8,0.55), 0 3px 0 rgba(0,0,0,0.45)',
  };

  /** Единый стиль чипов GFT / кристаллы / монеты / энергия / рейтинг (как на главной: компактно, перенос на телефоне). */
  const hudChipStyle: CSSProperties = {
    background: '#1e2937',
    padding: '4px 8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
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

  const filteredArtifacts = artifacts.filter(artifact => (
    (artifactTypeFilter === 'all' || artifact.type === artifactTypeFilter)
    && (artifactRarityFilter === 'all' || artifact.rarity === artifactRarityFilter)
  ));

  if (gamePhase === 'loading') {
    const pct = Math.round(loadProgress * 100);
    return (
      <div
        style={{
          minHeight: '100vh',
          color: 'white',
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          letterSpacing: '0.01em',
          backgroundImage:
            "linear-gradient(180deg, rgba(7,10,22,0.45) 0%, rgba(7,10,22,0.78) 60%, rgba(7,10,22,0.95) 100%), url('/images/backgrounds/loading-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px 56px',
          textAlign: 'center',
        }}
      >
        <style>{`
          @keyframes gftPulse { 0%,100% { opacity: 0.65; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } }
          @keyframes gftBarSheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
          @keyframes gftSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>

        <div
          style={{
            position: 'absolute',
            top: '14%',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            animation: 'gftPulse 2.4s ease-in-out infinite',
          }}
        >
          <div
            style={{
              fontSize: 'clamp(40px, 9vw, 64px)',
              fontWeight: 950,
              letterSpacing: '0.12em',
              background: 'linear-gradient(180deg, #fff7ad 0%, #facc15 42%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(234,179,8,0.5)',
            }}
          >
            GFT ARENA
          </div>
        </div>

        <div
          style={{
            width: '64px',
            height: '64px',
            border: '3px solid rgba(165,180,252,0.18)',
            borderTopColor: '#a5b4fc',
            borderRightColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'gftSpin 1.1s linear infinite',
            marginBottom: '22px',
            boxShadow: '0 0 28px rgba(124,58,237,0.45)',
          }}
        />

        <div
          style={{
            fontSize: '13px',
            color: '#c4b5fd',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 800,
            marginBottom: '14px',
            textShadow: '0 0 14px rgba(165,180,252,0.55)',
          }}
        >
          {assetsReady && progressHydrated ? 'Готово' : 'Загрузка ассетов'}
        </div>

        <div
          style={{
            position: 'relative',
            width: 'min(420px, 88vw)',
            height: '12px',
            background: 'rgba(15,23,42,0.85)',
            border: '1px solid rgba(165,180,252,0.35)',
            borderRadius: '999px',
            overflow: 'hidden',
            boxShadow: '0 0 24px rgba(124,58,237,0.35)',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed 0%, #a5b4fc 50%, #facc15 100%)',
              transition: 'width 0.25s ease-out',
              boxShadow: '0 0 18px rgba(165,180,252,0.55)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
              width: '40%',
              animation: 'gftBarSheen 1.6s ease-in-out infinite',
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div
          style={{
            marginTop: '12px',
            color: '#94a3b8',
            fontSize: '12px',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.1em',
          }}
        >
          {pct}%
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: '100%', overflowX: 'hidden', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', letterSpacing: '0.01em', boxSizing: 'border-box' }}>

      <header ref={headerRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, background: '#111',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingBottom: '8px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
        borderBottom: '2px solid #eab308',
        gap: '10px',
        flexWrap: 'wrap',
        boxSizing: 'border-box',
      }}>
        <div style={{ ...brandTextStyle, fontSize: 'clamp(16px, 4.2vw, 22px)', flex: '0 1 auto', minWidth: 0 }}>GFT ARENA</div>

        {gamePhase === 'playing' && screen !== 'home' && (
          <div
            title={playerId ? `ID: ${playerId}` : ''}
            style={{
              flex: '1 1 160px',
              minWidth: 0,
              maxWidth: '100%',
              fontSize: 'clamp(10px, 2.8vw, 11px)',
              fontWeight: 600,
              color: '#94a3b8',
              lineHeight: 1.35,
              textAlign: 'center',
              wordBreak: 'break-word',
            }}
          >
            {telegramDisplayName && (
              <div>
                <span style={{ color: '#64748b' }}>Telegram: </span>
                <span style={{ color: '#a5b4fc' }}>{telegramDisplayName}</span>
                {telegramUsername && <span style={{ color: '#64748b' }}> {telegramUsername}</span>}
              </div>
            )}
            <div>
              <span style={{ color: '#64748b' }}>Ник: </span>
              <span style={{ color: '#eab308' }}>{userName.trim() || '—'}</span>
              {playerId && (
                <>
                  <span style={{ color: '#64748b', marginLeft: '8px' }}>ID: </span>
                  <span style={{ color: '#22c55e', fontFamily: 'monospace' }}>
                    {playerId.length > 18 ? `${playerId.slice(0, 10)}…${playerId.slice(-6)}` : playerId}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {gamePhase === 'playing' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            alignItems: 'stretch',
            flex: '1 1 auto',
            minWidth: 0,
            maxWidth: '100%',
          }}>
          <div style={{
            display: 'flex',
            gap: '6px',
            fontSize: 'clamp(10px, 2.7vw, 13px)',
            fontWeight: 'bold',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            paddingBottom: '2px',
            width: '100%',
          }}>
            <div style={hudChipStyle}>
              💰 <span style={{ color: '#22c55e' }}>{balance}</span> GFT
            </div>
            <div style={hudChipStyle}>
              💎 <span style={{ color: '#ec4899' }}>{crystals}</span> крист.
            </div>
            <div style={hudChipStyle}>
              🪙 <span style={{ color: '#facc15' }}>{coins}</span> мон.
            </div>
            {screen !== 'home' && (
              <>
                <div style={hudChipStyle}>
                  ⚡ <span style={{ color: '#0ea5e9' }}>{energy}/{maxEnergy}</span>
                </div>
                <div style={hudChipStyle}>
                  🏆 <span style={{ color: '#a5b4fc' }}>{rating}</span>
                </div>
              </>
            )}
          </div>
            <div style={{ background: '#0b1220', padding: '6px 8px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end', alignSelf: 'flex-end', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {xrplAccount ? (
                <>
                  <span style={{ color: '#60a5fa', fontSize: 'clamp(10px, 2.6vw, 12px)' }}>
                    XRPL: {xrplAccount.slice(0, 5)}…{xrplAccount.slice(-4)}
                  </span>
                  <span style={{ color: '#22c55e', fontSize: 'clamp(10px, 2.6vw, 12px)' }}>{xrpBalance ? `${xrpBalance} XRP` : '...'}</span>
                  <span style={{ color: nftBonuses.holdRewardBonus > 0 ? '#facc15' : '#94a3b8', fontSize: 'clamp(10px, 2.6vw, 12px)' }}>
                    NFT: {nftBonusBusy ? '...' : `+${Math.round(nftBonuses.holdRewardBonus * 100)}% HOLD`}
                  </span>
                  <input
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    style={{ width: 'min(88px, 22vw)', minWidth: '56px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #334155', background: '#0a0a0a', color: '#fff', boxSizing: 'border-box' }}
                    inputMode="decimal"
                  />
                  <button
                    onClick={depositGft}
                    disabled={depositBusy}
                    style={{ padding: '6px 10px', background: depositBusy ? '#475569' : '#eab308', color: '#000', border: 'none', borderRadius: '8px', cursor: depositBusy ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: 'clamp(10px, 2.8vw, 12px)' }}
                  >
                    {depositBusy ? 'Depositing…' : 'Deposit GFT'}
                  </button>
                  <button onClick={disconnectXaman} style={{ padding: '6px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: 'clamp(10px, 2.8vw, 12px)' }}>
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={connectXaman}
                  disabled={xamanBusy}
                  style={{ padding: '8px 14px', background: xamanBusy ? '#475569' : '#60a5fa', color: '#000', border: 'none', borderRadius: '8px', cursor: xamanBusy ? 'not-allowed' : 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: 'clamp(12px, 3.2vw, 14px)' }}
                >
                  {xamanBusy ? 'Connecting…' : 'Connect Xaman'}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {gamePhase === 'playing' && !cardBattle && (
        <nav ref={bottomNavRef} style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17, 17, 17, 0.96)',
          padding: '8px 10px calc(10px + env(safe-area-inset-bottom, 0px))',
          display: 'grid', gridTemplateColumns: `repeat(${bottomNavItems.length}, 1fr)`, gap: '6px', zIndex: 100, borderTop: '2px solid #eab308',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', boxSizing: 'border-box',
        }}>
          {bottomNavItems.map(item => {
            const isActive = screen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => setScreen(item.screen)}
                style={{
                  position: 'relative',
                  minHeight: 'clamp(52px, 14vw, 64px)',
                  padding: 0,
                  border: 'none',
                  borderRadius: '16px',
                  background: 'transparent',
                  color: isActive ? item.activeColor : '#cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  fontWeight: 800,
                  overflow: 'hidden',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive
                    ? `0 0 0 1px ${item.activeColor}, 0 0 22px ${item.activeColor}66, inset 0 0 24px ${item.activeColor}33`
                    : '0 0 0 1px rgba(148,163,184,0.18)',
                }}
              >
                <img
                  src={item.tile}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: isActive ? 'saturate(1.15) brightness(1.05)' : 'saturate(0.7) brightness(0.7)',
                    transition: 'filter 0.2s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(7,10,22,0) 35%, rgba(7,10,22,0.85) 100%)'
                      : 'linear-gradient(180deg, rgba(7,10,22,0.25) 0%, rgba(7,10,22,0.88) 100%)',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    paddingBottom: '6px',
                    textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {receivedArtifact && (() => {
        const { artifact, source, subtitle } = receivedArtifact;
        const color = RARITY_CONFIG[artifact.rarity].color;
        const headerLabel = source === 'pve' ? 'Дроп с боя' : 'Награда батлпасса';
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 161, background: 'rgba(2,6,23,0.86)', display: 'grid', placeItems: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
            <div style={{ width: 'min(420px, 100%)', background: `linear-gradient(160deg, #111827, ${color}33 55%, #020617)`, border: `2px solid ${color}`, borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: `0 0 70px ${color}55` }}>
              <div style={{ ...cardTitleStyle(color), fontSize: '16px', letterSpacing: '0.16em' }}>{headerLabel}</div>
              {subtitle && <div style={{ ...metaTextStyle, marginTop: '4px' }}>{subtitle}</div>}
              <div style={{ fontSize: '74px', lineHeight: 1, margin: '16px 0 6px', filter: `drop-shadow(0 0 28px ${color}aa)` }}>{artifact.emoji}</div>
              <h3 style={{ ...heroNameStyle, margin: '8px 0 4px', color }}>{artifact.name}</h3>
              <div style={{ ...metaTextStyle, marginBottom: '14px' }}>
                {ARTIFACT_TYPE_LABELS[artifact.type]} • {artifact.rarity} • Качество {artifact.quality}
              </div>
              <div style={{ display: 'grid', gap: '6px', textAlign: 'left', background: 'rgba(2,6,23,0.55)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ color: '#fde68a', fontWeight: 900, fontSize: '13px' }}>
                  ⚡ Сила: {artifact.power}
                </div>
                <div style={{ color: '#a5b4fc', fontWeight: 800, fontSize: '13px' }}>
                  {BONUS_LABELS[artifact.primaryBonus.key]}: +{artifact.primaryBonus.value}
                </div>
                {artifact.secondaryBonuses.map(bonus => (
                  <div key={bonus.key} style={{ color: '#94a3b8', fontSize: '12px' }}>
                    • {BONUS_LABELS[bonus.key]}: +{bonus.value}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={() => setReceivedArtifact(null)} style={{ padding: '12px', borderRadius: '14px', border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', fontWeight: 900, cursor: 'pointer' }}>
                  Закрыть
                </button>
                <button
                  onClick={() => {
                    setReceivedArtifact(null);
                    setScreen('artifacts');
                  }}
                  style={{ padding: '12px', borderRadius: '14px', border: 'none', background: color, color: '#020617', fontWeight: 950, cursor: 'pointer' }}
                >
                  В инвентарь
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {receivedCard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(2,6,23,0.84)', display: 'grid', placeItems: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 'min(420px, 100%)', background: 'linear-gradient(160deg, #111827, #312e81 55%, #581c87)', border: '2px solid #eab308', borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: '0 0 60px rgba(234,179,8,0.32)' }}>
            <div style={{ ...cardTitleStyle('#eab308'), fontSize: '18px' }}>Получена карта</div>
            <div style={{ position: 'relative', width: '190px', height: '190px', margin: '18px auto 12px' }}>
              <img src={getCharacterCardImageUrl(receivedCard.id)} style={{ position: 'absolute', inset: 0, width: '190px', height: '190px', borderRadius: '24px', objectFit: 'cover' }} alt="" />
              <img src={getRarityFrameUrl(receivedCard.rarity)} style={{ position: 'absolute', inset: 0, width: '190px', height: '190px' }} alt="" />
            </div>
            <h3 style={{ ...heroNameStyle, margin: '8px 0 4px' }}>{receivedCard.name}</h3>
            <div style={{ ...metaTextStyle, marginBottom: '12px' }}>{receivedCard.rarity} • {receivedCard.element} • {receivedCard.kind}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '14px', color: '#e2e8f0', fontSize: '13px', fontWeight: 900 }}>
              <span>HP <b style={{ color: '#22c55e' }}>{receivedCard.hp}</b></span>
              <span>PWR <b style={{ color: '#f59e0b' }}>{receivedCard.power}</b></span>
              <span>SPD <b style={{ color: '#60a5fa' }}>{receivedCard.speed}</b></span>
            </div>
            <div style={{ color: '#c084fc', fontSize: '13px', fontWeight: 900, marginBottom: '18px' }}>
              ✨ {receivedCard.abilities[1].name} • {receivedCard.abilities[1].kind}
            </div>
            <button onClick={() => setReceivedCard(null)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: '#eab308', color: '#000', fontWeight: 950, cursor: 'pointer' }}>
              Забрать
            </button>
          </div>
        </div>
      )}

      {battleRewardModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 155, background: 'rgba(2,6,23,0.84)', display: 'grid', placeItems: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 'min(440px, 100%)', background: battleRewardModal.result === 'win' ? 'linear-gradient(160deg, #052e16, #0f172a 45%, #422006)' : 'linear-gradient(160deg, #111827, #312e81 55%, #450a0a)', border: `2px solid ${battleRewardModal.result === 'win' ? '#22c55e' : '#f97316'}`, borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: battleRewardModal.result === 'win' ? '0 0 70px rgba(34,197,94,0.28)' : '0 0 70px rgba(249,115,22,0.24)' }}>
            <div style={{ fontSize: '58px', lineHeight: 1, marginBottom: '10px' }}>{battleRewardModal.result === 'win' ? '🏆' : '🛡️'}</div>
            <h3 style={{ ...heroNameStyle, margin: '0 0 8px', color: battleRewardModal.result === 'win' ? '#86efac' : '#fdba74' }}>{battleRewardModal.title}</h3>
            <p style={{ ...metaTextStyle, margin: '0 0 16px' }}>{battleRewardModal.subtitle}</p>
            <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
              {battleRewardModal.rewards.map(reward => (
                <div key={reward} style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(226,232,240,0.18)', color: '#f8fafc', fontWeight: 950, boxShadow: 'inset 0 0 18px rgba(0,0,0,0.35)' }}>
                  {reward}
                </div>
              ))}
            </div>
            <button onClick={() => setBattleRewardModal(null)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: battleRewardModal.result === 'win' ? '#22c55e' : '#f97316', color: '#020617', fontWeight: 950, cursor: 'pointer' }}>
              Забрать
            </button>
          </div>
        </div>
      )}

      {/* Создание героя */}
      {gamePhase === 'create' && (
        <div
          style={{
            minHeight: '100vh',
            paddingTop: `${mainInsets.top}px`,
            paddingBottom: `calc(32px + env(safe-area-inset-bottom, 0px))`,
            textAlign: 'center',
            position: 'relative',
            backgroundImage:
              "linear-gradient(180deg, rgba(7,10,22,0.55) 0%, rgba(7,10,22,0.78) 55%, rgba(7,10,22,0.92) 100%), url('/images/backgrounds/hero-select-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundAttachment: 'scroll',
          }}
        >
          <h2 style={sectionTitleStyle()}>Создание героя</h2>
          <div
            style={{
              maxWidth: '420px',
              margin: '0 auto 16px',
              padding: '14px 16px',
              background: 'rgba(17,24,39,0.78)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid #334155',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '13px',
              color: '#94a3b8',
            }}
          >
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Имя в Telegram: </span>
              <span style={{ color: '#a5b4fc' }}>
                {telegramDisplayName || (isTelegram ? 'нет данных' : 'не Mini App')}
              </span>
              {telegramUsername && <span style={{ color: '#64748b' }}> {telegramUsername}</span>}
            </div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>ID игрока: </span>
              <span style={{ color: '#22c55e', fontFamily: 'monospace', wordBreak: 'break-all' }} title={playerId}>
                {playerId || '…'}
              </span>
            </div>
            {telegramUserId != null && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>Telegram user id: {telegramUserId}</div>
            )}
          </div>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Ник в игре"
            style={{
              width: '85%',
              maxWidth: '400px',
              padding: '16px',
              fontSize: '18px',
              background: '#1e2937',
              border: '2px solid #64748b',
              borderRadius: '12px',
              color: 'white',
              marginBottom: '14px',
            }}
          />
          <div style={{ ...metaTextStyle, marginBottom: '16px' }}>
            Ник виден в игре; имя из Telegram — для отображения профиля.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', padding: '0 12px', maxWidth: '520px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {allHeroes.map(hero => (
              <div
                key={hero.id}
                onClick={() => userName.trim() && selectMainHero(hero)}
                style={{
                  minWidth: 0,
                  background: 'rgba(17,24,39,0.72)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  border: '1px solid rgba(165,180,252,0.35)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.18)',
                  borderRadius: '16px',
                  padding: '8px',
                  cursor: userName.trim() ? 'pointer' : 'not-allowed',
                  opacity: userName.trim() ? 1 : 0.6,
                  boxSizing: 'border-box',
                }}
              >
                <img src={hero.image} style={{ width: '100%', borderRadius: '12px', display: 'block' }} alt={hero.name} />
                <p style={{ ...cardTitleStyle('#eab308'), margin: '8px 0 2px', fontSize: 'clamp(11px, 3vw, 14px)', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{hero.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Главный экран */}
      {gamePhase === 'playing' && screen === 'home' && mainHero && (
        <div style={{
          minHeight: '100dvh',
          backgroundImage: `url('${getBackground()}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'scroll',
          paddingTop: `calc(${mainInsets.top}px + ${homeProfileStackReserve})`,
          paddingBottom: `${mainInsets.bottom}px`,
          textAlign: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}>
          <img
            src={getZodiacAvatarUrl(mainHero.zodiac)}
            alt=""
            style={{
              position: 'fixed',
              top: `calc(${mainInsets.top}px + 4px)`,
              left: 'clamp(6px, 2.5vw, 10px)',
              width: 'clamp(36px, 11vw, 52px)',
              height: 'clamp(36px, 11vw, 52px)',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #eab308',
              boxShadow: '0 0 18px rgba(234, 179, 8, 0.5), inset 0 0 10px rgba(0,0,0,0.35)',
              zIndex: 60,
              background: '#0f172a',
            }}
          />
          <div
            title={playerId ? `ID: ${playerId}` : undefined}
            style={{
              position: 'fixed',
              top: `calc(${mainInsets.top}px + 4px + clamp(36px, 11vw, 52px) + 4px)`,
              left: 'clamp(6px, 2.5vw, 10px)',
              zIndex: 60,
              maxWidth: 'min(calc(100vw - 20px), 178px)',
              textAlign: 'left',
              fontSize: 'clamp(9px, 2.65vw, 11px)',
              fontWeight: 650,
              color: '#94a3b8',
              lineHeight: 1.22,
              wordBreak: 'break-word',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              borderRadius: '10px',
              padding: '5px 7px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              fontVariantNumeric: 'tabular-nums',
              maxHeight: 'min(20vh, 92px)',
              overflow: 'hidden',
            }}
          >
            {telegramDisplayName && (
              <div style={{
                marginBottom: '2px',
                fontSize: 'clamp(8px, 2.35vw, 10px)',
                lineHeight: 1.2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical' as const,
              }}
              >
                <span style={{ color: '#64748b' }}>TG: </span>
                <span style={{ color: '#a5b4fc' }}>{telegramDisplayName}</span>
                {telegramUsername && <span style={{ color: '#64748b' }}> {telegramUsername}</span>}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 6px', alignItems: 'baseline' }}>
              <span><span style={{ color: '#64748b' }}>Ник: </span><span style={{ color: '#eab308' }}>{userName.trim() || '—'}</span></span>
              {playerId && (
                <span>
                  <span style={{ color: '#64748b' }}>ID: </span>
                  <span style={{ color: '#22c55e', fontFamily: 'monospace', fontWeight: 700 }}>
                    {playerId.length > 18 ? `${playerId.slice(0, 10)}…${playerId.slice(-6)}` : playerId}
                  </span>
                </span>
              )}
            </div>
            <div style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px solid rgba(71, 85, 105, 0.65)', display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
              <span><span style={{ color: '#64748b' }}>🏆 </span><span style={{ color: '#a5b4fc', fontWeight: 700 }}>{rating}</span></span>
              <span><span style={{ color: '#64748b' }}>⚡ </span><span style={{ color: '#0ea5e9', fontWeight: 700 }}>{energy}/{maxEnergy}</span></span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScreen('battlepass')}
            style={{
              position: 'fixed',
              top: `calc(${mainInsets.top}px + 4px)`,
              right: 'clamp(6px, 2.5vw, 10px)',
              left: 'auto',
              zIndex: 60,
              width: 'min(50vw, 182px)',
              margin: 0,
              padding: '6px 8px',
              textAlign: 'left',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(250, 204, 21, 0.4)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
              <span style={{ ...cardTitleStyle('#facc15'), fontSize: 'clamp(9px, 2.5vw, 11px)', letterSpacing: '0.02em' }}>Батлпасс</span>
              {battlePassPremium ? (
                <span style={{ fontSize: 'clamp(8px, 2.2vw, 10px)', color: '#86efac', fontWeight: 800 }}>★</span>
              ) : (
                <span style={{ fontSize: 'clamp(8px, 2.2vw, 10px)', color: '#64748b', fontWeight: 700 }}>FREE</span>
              )}
            </div>
            <div style={{ fontSize: 'clamp(9px, 2.65vw, 11px)', fontWeight: 750, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
              Ур. <span style={{ color: '#facc15' }}>{currentBattlePassLevel}</span>/{BATTLEPASS_TIERS.length}
            </div>
            <div style={{ fontSize: 'clamp(8px, 2.35vw, 10px)', color: '#94a3b8', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
              {currentBattlePassLevelXp}/{BATTLEPASS_XP_PER_LEVEL} XP
            </div>
            <div
              style={{
                marginTop: '5px',
                height: '6px',
                borderRadius: '999px',
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(71, 85, 105, 0.6)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (currentBattlePassLevelXp / BATTLEPASS_XP_PER_LEVEL) * 100)}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #22c55e, #eab308)',
                  transition: 'width 0.25s ease-out',
                }}
              />
            </div>
            {homeBpCurrentFreeQuest ? (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(71, 85, 105, 0.5)' }}>
                <div style={{ fontSize: 'clamp(6px, 1.8vw, 8px)', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Задание</div>
                <div
                  style={{
                    fontSize: 'clamp(8px, 2.3vw, 10px)',
                    color: '#f1f5f9',
                    fontWeight: 750,
                    lineHeight: 1.25,
                    marginTop: '3px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {homeBpCurrentFreeQuest.title}
                </div>
                <div style={{ fontSize: 'clamp(7px, 2vw, 9px)', color: '#94a3b8', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.min(battlePassQuestProgress[homeBpCurrentFreeQuest.id] ?? 0, homeBpCurrentFreeQuest.target)}/{homeBpCurrentFreeQuest.target}
                </div>
                <div style={{ marginTop: '4px', height: '4px', borderRadius: '999px', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(71, 85, 105, 0.5)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(Math.min(battlePassQuestProgress[homeBpCurrentFreeQuest.id] ?? 0, homeBpCurrentFreeQuest.target) / homeBpCurrentFreeQuest.target) * 100}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: homeBpCurrentFreeQuest.accent,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(71, 85, 105, 0.5)', fontSize: 'clamp(7px, 2vw, 9px)', color: '#86efac', fontWeight: 700 }}>
                Все задания ✓
              </div>
            )}
            {homeBpPremiumQuest && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '5px 6px',
                  borderRadius: '8px',
                  background: battlePassPremium
                    ? 'linear-gradient(145deg, rgba(88, 28, 135, 0.5), rgba(30, 27, 75, 0.72))'
                    : 'linear-gradient(145deg, rgba(45, 20, 70, 0.35), rgba(15, 23, 42, 0.92))',
                  border: battlePassPremium ? '1px solid rgba(232, 121, 249, 0.75)' : '1px dashed rgba(168, 85, 247, 0.45)',
                  boxShadow: battlePassPremium ? '0 0 16px rgba(192, 132, 252, 0.28), inset 0 0 12px rgba(88, 28, 135, 0.2)' : 'inset 0 0 10px rgba(0,0,0,0.35)',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(6px, 1.8vw, 8px)',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    background: 'linear-gradient(90deg, #fce7f3, #e879f9, #facc15)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    color: '#f0abfc',
                  }}
                >
                  ПРЕМИУМ
                </div>
                <div
                  style={{
                    fontSize: 'clamp(8px, 2.25vw, 10px)',
                    color: battlePassPremium ? '#fdf4ff' : '#c4b5fd',
                    fontWeight: 750,
                    lineHeight: 1.25,
                    marginTop: '3px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {homeBpPremiumQuest.title}
                </div>
                {!battlePassPremium ? (
                  <div style={{ fontSize: 'clamp(7px, 2vw, 9px)', color: '#a78bfa', marginTop: '4px', fontWeight: 700 }}>Открой премиум BP</div>
                ) : (
                  <>
                    <div style={{ fontSize: 'clamp(7px, 2vw, 9px)', color: '#e9d5ff', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.min(battlePassQuestProgress[homeBpPremiumQuest.id] ?? 0, homeBpPremiumQuest.target)}/{homeBpPremiumQuest.target} побед PVP
                    </div>
                    <div style={{ marginTop: '4px', height: '4px', borderRadius: '999px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(192, 132, 252, 0.35)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(Math.min(battlePassQuestProgress[homeBpPremiumQuest.id] ?? 0, homeBpPremiumQuest.target) / homeBpPremiumQuest.target) * 100}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, #c084fc, #facc15)',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </button>
          <div style={{ ...brandTextStyle, fontSize: 'clamp(17px, 5vw, 28px)', lineHeight: 1, padding: '0 6px', marginTop: '0' }}>GFT ARENA</div>
          <div style={{ margin: 'clamp(4px, 1.5vw, 10px) auto clamp(4px, 1.5vw, 12px)', maxWidth: '300px', width: 'min(86vw, 300px)' }}>
            <img src={mainHero.image} style={{ width: '100%', maxHeight: 'min(22dvh, 28vh, 200px)', objectFit: 'contain', filter: 'drop-shadow(0 0 50px rgba(234,179,8,0.75))' }} alt="" />
          </div>
          <h2 style={{ ...heroNameStyle, fontSize: 'clamp(14px, 3.8vw, 22px)', margin: '0 0 2px', paddingLeft: '8px', paddingRight: '8px' }}>{mainHero.name}</h2>
          <p style={{ ...metaTextStyle, margin: 0, fontSize: 'clamp(11px, 2.85vw, 14px)' }}>{mainHero.zodiac} • Lv. {mainHero.level} ★{mainHero.stars}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', maxWidth: '420px', margin: '6px auto 0', padding: '0 clamp(8px, 3.5vw, 14px)' }}>
            <button
              type="button"
              onClick={() => setScreen('levelup')}
              style={{ minHeight: '40px', padding: '7px 9px', background: 'rgba(30,41,59,0.88)', color: '#fff', border: '1px solid #f59e0b', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.22)' }}
            >
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon3D id="levelup-3d" size={28} />
                <span style={{ ...cardTitleStyle('#eab308'), fontSize: 'clamp(11px, 3vw, 14px)' }}>Прокачка</span>
              </div>
              <div style={{ ...mutedTextStyle, fontSize: 'clamp(9px, 2.5vw, 11px)', marginTop: '2px', lineHeight: 1.25 }}>Сила и звёзды</div>
            </button>
            <button
              type="button"
              onClick={() => setScreen('farm')}
              style={{ minHeight: '40px', padding: '7px 9px', background: 'rgba(30,41,59,0.88)', color: '#fff', border: '1px solid #22c55e', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.22)' }}
            >
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon3D id="farm-3d" size={28} />
                <span style={{ ...cardTitleStyle('#22c55e'), fontSize: 'clamp(11px, 3vw, 14px)' }}>HOLD фарм</span>
              </div>
              <div style={{ ...mutedTextStyle, fontSize: 'clamp(9px, 2.5vw, 11px)', marginTop: '2px', lineHeight: 1.25 }}>GFT под %</div>
            </button>
            <button
              type="button"
              onClick={claimDailyReward}
              disabled={dailyRewardClaimedToday}
              style={{ gridColumn: '1 / -1', minHeight: '40px', padding: '7px 10px', background: dailyRewardClaimedToday ? 'rgba(30,41,59,0.88)' : 'linear-gradient(135deg, rgba(21,128,61,0.92), rgba(14,165,233,0.86))', color: '#fff', border: `1px solid ${dailyRewardClaimedToday ? '#475569' : dailyReward.accent}`, borderRadius: '14px', textAlign: 'left', cursor: dailyRewardClaimedToday ? 'default' : 'pointer', opacity: dailyRewardClaimedToday ? 0.75 : 1, boxShadow: dailyRewardClaimedToday ? '0 8px 20px rgba(0,0,0,0.18)' : '0 12px 26px rgba(34,197,94,0.18)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: 'clamp(26px, 7vw, 34px)', flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>🎁</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...cardTitleStyle(dailyReward.accent), fontSize: 'clamp(11px, 3vw, 14px)' }}>Ежедневная награда • {dailyReward.tier}</div>
                  <div style={{ ...mutedTextStyle, fontSize: 'clamp(9px, 2.5vw, 11px)', marginTop: '2px', lineHeight: 1.25 }}>
                    {dailyRewardClaimedToday ? 'Сегодня уже получена' : `${dailyReward.coins} мон., ${dailyReward.crystals} крист.`}
                  </div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setScreen('battlepass')}
              style={{ gridColumn: '1 / -1', minHeight: '40px', padding: '7px 10px', background: 'linear-gradient(135deg, rgba(88,28,135,0.92), rgba(194,65,12,0.9))', color: '#fff', border: '1px solid #facc15', borderRadius: '14px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 12px 26px rgba(250,204,21,0.18)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: 'clamp(26px, 7vw, 34px)', flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' }}>🏆</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...cardTitleStyle('#facc15'), fontSize: 'clamp(11px, 3vw, 14px)' }}>Батлпасс сезона</div>
                  <div style={{ ...mutedTextStyle, fontSize: 'clamp(9px, 2.5vw, 11px)', marginTop: '2px', lineHeight: 1.25 }}>
                    Ур. {currentBattlePassLevel}/{BATTLEPASS_TIERS.length} • {battlePassXp} XP
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Батлпасс */}
      {gamePhase === 'playing' && screen === 'battlepass' && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box' }}>
          <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>🏆 БАТЛПАСС</h2>
          <div style={{ maxWidth: '680px', margin: '0 auto 18px', padding: '0 16px' }}>
            <p
              style={{
                ...metaTextStyle,
                color: '#e2e8f0',
                margin: 0,
                padding: '14px 16px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                textAlign: 'left',
                background: 'rgba(15,23,42,0.94)',
                border: '1px solid rgba(148,163,184,0.35)',
                borderRadius: '18px',
                boxShadow: '0 14px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                textShadow: 'none',
              }}
            >
              Сначала задания «Вводный тур» и «Тренировочный PvE» привязаны к обучению; дальше — кампания, HOLD, PVP и наборы. Максимум <b style={{ color: '#a5b4fc' }}>50 уровней</b>. Бесплатная дорожка — фарм, премиум — кристаллы и наборы.
            </p>
          </div>

          <div style={{ maxWidth: '960px', margin: '0 auto 18px', padding: '0 16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(250,204,21,0.45)', borderRadius: '22px', padding: '16px', boxShadow: '0 18px 40px rgba(0,0,0,0.28)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', textAlign: 'left' }}>
                <div>
                  <div style={cardTitleStyle('#facc15')}>Сезон “Зов арены”</div>
                  <div style={{ ...mutedTextStyle, fontSize: '13px', marginTop: '4px' }}>
                    Открыт уровень {currentBattlePassLevel} из {BATTLEPASS_TIERS.length} • {currentBattlePassLevelXp}/{BATTLEPASS_XP_PER_LEVEL} XP до следующего уровня
                  </div>
                </div>
                <button
                  onClick={buyBattlePassPremium}
                  disabled={battlePassPremium}
                  style={{ padding: '12px 16px', borderRadius: '14px', border: 'none', background: battlePassPremium ? '#166534' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 950, cursor: battlePassPremium ? 'default' : 'pointer', fontSize: 'clamp(11px, 3vw, 14px)', width: '100%', maxWidth: '320px' }}
                >
                  {battlePassPremium ? 'Премиум открыт' : `Открыть премиум • ${BATTLEPASS_PRICE_GFT} GFT`}
                </button>
              </div>
              <div style={{ height: '10px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '14px' }}>
                <div style={{ width: `${Math.min(100, (battlePassXp / ((BATTLEPASS_TIERS.length - 1) * BATTLEPASS_XP_PER_LEVEL)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #eab308)' }} />
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '960px', margin: '0 auto 18px', padding: '0 16px', textAlign: 'left' }}>
            <div style={{ ...cardTitleStyle('#e2e8f0'), marginBottom: '10px' }}>Задания сезона</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
              {BATTLEPASS_QUESTS.map(quest => {
                const isPremiumQuest = quest.track === 'paid';
                const progress = Math.min(battlePassQuestProgress[quest.id] ?? 0, quest.target);
                const done = progress >= quest.target;
                const premiumLocked = isPremiumQuest && !battlePassPremium && !done;
                return (
                  <div
                    key={quest.id}
                    style={{
                      background: isPremiumQuest
                        ? 'linear-gradient(165deg, rgba(88,28,135,0.42), rgba(15,23,42,0.94) 48%, rgba(30,27,75,0.88))'
                        : 'rgba(15,23,42,0.88)',
                      border: `2px solid ${done ? '#22c55e' : isPremiumQuest ? 'rgba(232,121,249,0.85)' : quest.accent}`,
                      borderRadius: '18px',
                      padding: '14px',
                      boxShadow: isPremiumQuest
                        ? '0 0 22px rgba(192,132,252,0.22), 0 12px 28px rgba(0,0,0,0.28), inset 0 0 18px rgba(88,28,135,0.15)'
                        : '0 12px 28px rgba(0,0,0,0.22)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
                      <div style={{ minWidth: 0 }}>
                        {isPremiumQuest && (
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 950,
                              letterSpacing: '0.12em',
                              marginBottom: '6px',
                              background: 'linear-gradient(90deg, #fce7f3, #e879f9, #facc15)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              color: '#f0abfc',
                            }}
                          >
                            ПРЕМИУМ ТРЕК
                          </div>
                        )}
                        <div style={cardTitleStyle(done ? '#86efac' : isPremiumQuest ? '#f0abfc' : quest.accent)}>{quest.title}</div>
                        <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '4px' }}>{quest.description}</div>
                        {premiumLocked && (
                          <div style={{ fontSize: '11px', color: '#c4b5fd', marginTop: '8px', fontWeight: 800 }}>
                            Открой премиум Battle Pass, чтобы копить прогресс
                          </div>
                        )}
                      </div>
                      <div style={{ color: done ? '#22c55e' : isPremiumQuest ? '#f9a8d4' : '#facc15', fontWeight: 950, whiteSpace: 'nowrap' }}>
                        {premiumLocked ? '—' : `${progress}/${quest.target}`}
                      </div>
                    </div>
                    <div style={{ height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '12px' }}>
                      <div
                        style={{
                          width: premiumLocked ? '0%' : `${(progress / quest.target) * 100}%`,
                          height: '100%',
                          background: done ? '#22c55e' : isPremiumQuest ? 'linear-gradient(90deg, #c084fc, #facc15)' : quest.accent,
                        }}
                      />
                    </div>
                    <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '8px' }}>
                      {done ? 'Задание выполнено' : premiumLocked ? `+${quest.xpPerStep} BP XP за шаг после покупки премиума` : `+${quest.xpPerStep} BP XP за каждый прогресс`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px', display: 'grid', gap: '12px' }}>
            {BATTLEPASS_TIERS.map(tier => {
              const unlocked = tier.level <= currentBattlePassLevel;
              const freeClaimed = isBattlePassRewardClaimed(tier.level, 'free');
              const paidClaimed = isBattlePassRewardClaimed(tier.level, 'paid');
              return (
                <div key={tier.level} style={{ display: 'grid', gridTemplateColumns: 'minmax(48px, 56px) minmax(0, 1fr) minmax(0, 1fr)', gap: '8px', alignItems: 'stretch', width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'grid', placeItems: 'center', background: unlocked ? 'linear-gradient(160deg, #422006, #111827 72%)' : 'linear-gradient(160deg, #111827, #020617)', border: `2px solid ${unlocked ? '#eab308' : '#475569'}`, borderRadius: '18px', color: unlocked ? '#facc15' : '#94a3b8', fontWeight: 950, fontSize: 'clamp(11px, 2.8vw, 14px)', boxShadow: unlocked ? '0 0 24px rgba(234,179,8,0.24), inset 0 0 18px rgba(0,0,0,0.55)' : 'inset 0 0 18px rgba(0,0,0,0.65)', padding: '4px' }}>
                    Lv. {tier.level}
                  </div>
                  {(['free', 'paid'] as const).map(track => {
                    const claimed = track === 'free' ? freeClaimed : paidClaimed;
                    const lockedByPremium = track === 'paid' && !battlePassPremium;
                    const reward = tier[track];
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() => claimBattlePassReward(tier, track)}
                        disabled={!unlocked || claimed || lockedByPremium}
                        style={{ padding: '10px 8px', minHeight: '72px', minWidth: 0, background: claimed ? 'linear-gradient(135deg, #064e3b, #0f172a 72%)' : track === 'free' ? 'linear-gradient(135deg, #0f172a, #111827 58%, #020617)' : 'linear-gradient(135deg, #581c87, #1e3a8a 58%, #020617)', border: `2px solid ${claimed ? '#22c55e' : track === 'free' ? '#60a5fa' : '#c084fc'}`, borderRadius: '18px', color: unlocked ? '#fff' : '#cbd5e1', textAlign: 'left', cursor: unlocked && !claimed && !lockedByPremium ? 'pointer' : 'default', boxShadow: claimed ? '0 0 24px rgba(34,197,94,0.22), inset 0 0 20px rgba(0,0,0,0.42)' : '0 14px 30px rgba(2,6,23,0.58), inset 0 0 20px rgba(0,0,0,0.52)', filter: unlocked ? 'none' : 'saturate(0.65)', boxSizing: 'border-box' }}
                      >
                        <div style={{ ...cardTitleStyle(track === 'free' ? '#93c5fd' : '#f0abfc'), fontSize: 'clamp(11px, 2.8vw, 14px)' }}>{track === 'free' ? 'Бесплатно' : 'Премиум'}</div>
                        <div style={{ fontSize: 'clamp(11px, 2.9vw, 13px)', fontWeight: 900, marginTop: '6px', lineHeight: 1.25, wordBreak: 'break-word' }}>{reward.label}</div>
                        <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '6px' }}>
                          {claimed ? 'Забрано' : lockedByPremium ? 'Нужен премиум' : unlocked ? 'Нажми, чтобы забрать' : 'Откроется позже'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Арена */}
      {gamePhase === 'playing' && screen === 'arena' && !cardBattle && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center' }}>
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
                    Соперники по близости рейтинга. Твой рейтинг:{' '}
                    <b style={{ color: '#fde047', fontWeight: 800 }}>{rating}</b>
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
                      <span style={{ fontSize: '36px', flexShrink: 0 }}>{pvpEmojiForPlayerId(opp.playerId)}</span>
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
                      onClick={() =>
                        void startCardBattle(
                          {
                            id: Number(opp.playerId) || 0,
                            name: opp.name || `Игрок #${opp.playerId}`,
                            emoji: pvpEmojiForPlayerId(opp.playerId),
                            power: opp.power,
                            maxHP: opp.maxHP,
                          },
                          'pvp',
                          undefined,
                          { pvpOpponentRating: opp.rating },
                        )
                      }
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
                Материалы: {materials} | Артефакты: {artifacts.length} | Выбрано: Глава {currentChapter}, Уровень {currentLevel}
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
                  onClick={startTrainingPveBattle}
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
                    onClick={() => { setCurrentChapter(ch); setCurrentLevel(1); }} 
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

              {currentChapter && (
                <div style={{ marginTop: '30px' }}>
                  <h4 style={{ color: '#0ea5e9' }}>Глава {currentChapter} - Выбери уровень</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '16px' }}>
                    {Array.from({ length: 6 }, (_, i) => i + 1).map(lvl => {
                      const requiredLevel = getRequiredHeroLevelForStage(currentChapter, lvl);
                      const locked = !canEnterPveStage(currentChapter, lvl);
                      return (
                        <button
                          key={lvl}
                          onClick={() => { setCurrentLevel(lvl); startPveBattle(currentChapter, lvl); }}
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
                Соревнуйся в PVP за недельные и месячные призы. Твой текущий рейтинг: <b style={{ color: '#a5b4fc' }}>{rating}</b>.
                Таблица ниже — <b>реальные тестеры</b> с сервера (ник и прогресс из сохранённых профилей).
                {arenaLeaderboardLoading && <> Загрузка…</>}
                {arenaLeaderboardError && !arenaLeaderboardLoading && (
                  <> <span style={{ color: '#f97316' }}>Список с сервера недоступен — показан только твой локальный результат.</span></>
                )}
              </p>

              <div style={{ display: 'inline-flex', background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', borderRadius: '999px', padding: '5px', marginBottom: '18px' }}>
                {(['week', 'month'] as const).map(period => (
                  <button
                    key={period}
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
                        const isPlayer = Boolean(playerId && entry.playerId === playerId) || (!entry.playerId && entry.name === (userName.trim() || 'Ты'));
                        const medal = entry.place === 1 ? '🥇' : entry.place === 2 ? '🥈' : entry.place === 3 ? '🥉' : `#${entry.place}`;
                        return (
                          <div key={entry.playerId ? `pid-${entry.playerId}` : `row-${entry.place}-${entry.name}`} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) auto', gap: '8px', alignItems: 'center', padding: '10px', borderRadius: '14px', background: isPlayer ? 'rgba(234,179,8,0.16)' : '#0b1220', border: `1px solid ${isPlayer ? '#eab308' : '#334155'}` }}>
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
                  <div style={{ ...mutedTextStyle, fontSize: '11px', marginTop: '12px' }}>
                    Награды выдаются после окончания периода. Рейтинг растёт за победы в PVP 3×3.
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Карточный бой 3×3 — компактная вёрстка под узкие экраны / Telegram WebView */}
      {cardBattle && (
        <div
          style={{
            minHeight: '100vh',
            boxSizing: 'border-box',
            backgroundImage: `linear-gradient(180deg, rgba(7,10,22,0.65) 0%, rgba(7,10,22,0.9) 100%), url('/images/backgrounds/arena-bg.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll',
            ...mainScrollPadding,
          }}
        >
          {battleVfx && <BattleVfxOverlay key={battleVfx.id} effect={battleVfx} />}
          <div style={{ padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cardBattle.isTrainingPve && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'rgba(6, 78, 59, 0.55)',
                  border: '1px solid #34d399',
                  color: '#d1fae5',
                  fontSize: 'clamp(12px, 3.1vw, 14px)',
                  lineHeight: 1.45,
                  fontWeight: 600,
                }}
              >
                <div style={{ color: '#6ee7b7', fontWeight: 900, marginBottom: '6px' }}>Обучающий бой</div>
                <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                  <li>Когда твой ход — сначала ткни врага (низ) как цель, потом жми «Базовая» или «Навык» (под картой).</li>
                  <li>К навыку с перезарядкой полоска; хил на союзника — выбери союзника (верх) при необходимости.</li>
                  <li>«Авто» ускоряет бой, для тренировки лучше оставь выкл. и поймёшь механику.</li>
                </ul>
              </div>
            )}
            <div style={{ ...cardTitleStyle('#eab308'), fontSize: 'clamp(12px, 3.4vw, 15px)', lineHeight: 1.3, wordBreak: 'break-word' }}>
              <div>🃏 3×3 vs {cardBattle.opponent.emoji} {cardBattle.opponent.name}</div>
              <div style={{ color: '#fde68a', marginTop: '4px' }}>Раунд {cardBattle.round}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCardBattle(prev => (prev ? { ...prev, auto: !prev.auto } : prev))}
                disabled={cardBattle.turn === 'ended'}
                style={{
                  flex: '1 1 42%',
                  minWidth: '120px',
                  padding: '10px 12px',
                  background: cardBattle.auto ? '#22c55e' : '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: 'clamp(12px, 3.2vw, 14px)',
                }}
              >
                {cardBattle.auto ? '⏸ Авто ВКЛ' : '▶️ Авто'}
              </button>
              <button
                type="button"
                onClick={() => setCardBattle(null)}
                style={{
                  flex: '0 0 auto',
                  padding: '10px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: '0 12px 10px' }}>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x proximity',
                background: 'rgba(15,23,42,0.92)',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '8px',
                overscrollBehaviorX: 'contain',
              }}
            >
              {cardBattle.turnOrder
                .map(uid => getFighterByUid(uid, cardBattle.playerTeam, cardBattle.botTeam))
                .filter((fighter): fighter is CardFighter => Boolean(fighter && fighter.hp > 0))
                .map(fighter => {
                  const side = getFighterSide(fighter.uid, cardBattle.playerTeam, cardBattle.botTeam);
                  const active = cardBattle.activeFighterUid === fighter.uid;
                  return (
                    <div
                      key={fighter.uid}
                      title={fighter.name}
                      style={{
                        flex: '0 0 auto',
                        scrollSnapAlign: 'start',
                        maxWidth: 'min(118px, 32vw)',
                        minWidth: '72px',
                        borderRadius: '12px',
                        border: active ? '2px solid #eab308' : '1px solid #475569',
                        background: active ? 'rgba(234,179,8,0.18)' : '#0b1220',
                        color: side === 'player' ? '#bfdbfe' : '#fecaca',
                        padding: '6px 8px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textAlign: 'center',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}
                    >
                      {active ? '▶ ' : ''}
                      {side === 'player' ? '🟦 ' : '🟥 '}
                      {fighter.name}
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', padding: '0 12px' }}>
            <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '12px', padding: '10px', minWidth: 0 }}>
              <div style={{ ...cardTitleStyle('#a5b4fc'), marginBottom: '8px', fontSize: 'clamp(13px, 3.5vw, 16px)' }}>🟦 Твой отряд</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {cardBattle.playerTeam.map(c => {
                  const isAttacker = cardBattle.activeFighterUid === c.uid;
                  const isAllyTarget = cardBattle.selectedAllyUid === c.uid;
                  const canSelect = c.hp > 0 && cardBattle.turn === 'player' && !cardBattle.auto;
                  return (
                    <div
                      key={c.uid}
                      style={{
                        minWidth: 0,
                        background: '#0b1220',
                        border: isAttacker ? '2px solid #eab308' : isAllyTarget ? '2px solid #38bdf8' : '1px solid #334155',
                        borderRadius: '10px',
                        padding: '8px 6px',
                        opacity: c.hp > 0 ? 1 : 0.45,
                        cursor: canSelect ? 'pointer' : 'default',
                        boxShadow: isAttacker ? '0 0 14px rgba(234,179,8,0.3)' : isAllyTarget ? '0 0 14px rgba(56,189,248,0.25)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                        <img src={c.image} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', left: '4px', top: '4px' }} alt="" />
                        <img src={getRarityFrameUrl(c.rarity)} style={{ position: 'absolute', inset: 0, width: '44px', height: '44px' }} alt="" />
                      </div>
                      <div style={{ minWidth: 0, width: '100%', marginTop: '6px' }}>
                        <div style={{ fontWeight: 800, fontSize: '10px', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }} title={c.name}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.role}>
                          {c.role}
                        </div>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '9px', color: '#94a3b8', lineHeight: 1.35 }}>
                        <span style={{ color: '#22c55e', fontWeight: 800 }}>{c.hp}</span>/{c.maxHP}
                        {c.shield > 0 && <span style={{ color: '#38bdf8' }}> · 🛡{c.shield}</span>}
                        {c.stunnedTurns > 0 && <span style={{ color: '#facc15' }}> · 💫</span>}
                        {c.dotTurns > 0 && <span style={{ color: '#a855f7' }}> · ☠{c.dotTurns}</span>}
                        {c.cooldowns.skill > 0 && <span style={{ color: '#c084fc' }}> · ✨{c.cooldowns.skill}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', width: '100%', alignItems: 'center' }}>
                        {isAttacker && <span style={{ fontSize: '9px', color: '#eab308', fontWeight: 900 }}>АТАКУЕТ</span>}
                        {isAllyTarget && <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 900 }}>ПОДД.</span>}
                        {canSelect && (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              setCardBattle(prev => (prev ? { ...prev, selectedAllyUid: c.uid } : prev));
                            }}
                            style={{
                              padding: '4px 6px',
                              borderRadius: '8px',
                              border: '1px solid #38bdf8',
                              background: isAllyTarget ? '#38bdf8' : 'transparent',
                              color: isAllyTarget ? '#020617' : '#bae6fd',
                              fontSize: '9px',
                              fontWeight: 900,
                              width: '100%',
                              maxWidth: '100%',
                            }}
                          >
                            Цель
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: '#111827', border: '1px solid #334155', borderRadius: '12px', padding: '10px', minWidth: 0 }}>
              <div style={{ ...cardTitleStyle('#fca5a5'), marginBottom: '8px', fontSize: 'clamp(13px, 3.5vw, 16px)' }}>🟥 Защита (бот)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                {cardBattle.botTeam.map(c => {
                  const isTarget = cardBattle.selectedTargetUid === c.uid;
                  return (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => c.hp > 0 && setCardBattle(prev => (prev ? { ...prev, selectedTargetUid: c.uid } : prev))}
                      disabled={c.hp <= 0 || cardBattle.turn !== 'player' || cardBattle.auto}
                      style={{
                        minWidth: 0,
                        textAlign: 'center',
                        background: '#0b1220',
                        border: isTarget ? '2px solid #eab308' : '1px solid #334155',
                        borderRadius: '10px',
                        padding: '8px 6px',
                        opacity: c.hp > 0 ? 1 : 0.45,
                        cursor: c.hp > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                        <img src={c.image} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', left: '4px', top: '4px' }} alt="" />
                        <img src={getRarityFrameUrl(c.rarity)} style={{ position: 'absolute', inset: 0, width: '44px', height: '44px' }} alt="" />
                      </div>
                      <div style={{ minWidth: 0, width: '100%', marginTop: '6px' }}>
                        <div style={{ fontWeight: 800, fontSize: '10px', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }} title={c.name}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.role}>
                          {c.role}
                        </div>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '9px', color: '#94a3b8' }}>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{c.hp}</span>/{c.maxHP}
                        {c.shield > 0 && <span style={{ color: '#38bdf8' }}> · 🛡{c.shield}</span>}
                        {c.stunnedTurns > 0 && <span style={{ color: '#facc15' }}> · 💫</span>}
                        {c.dotTurns > 0 && <span style={{ color: '#a855f7' }}> · ☠{c.dotTurns}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ color: '#94a3b8', fontSize: 'clamp(11px, 3.2vw, 13px)', lineHeight: 1.35 }}>
                  Ход:{' '}
                  <span style={{ color: cardBattle.turn === 'player' ? '#22c55e' : cardBattle.turn === 'bot' ? '#f87171' : '#94a3b8', fontWeight: 900 }}>
                    {cardBattle.turn === 'player' ? 'твой' : cardBattle.turn === 'bot' ? 'бота' : 'конец'}
                  </span>
                  {cardBattle.activeFighterUid && (
                    <span style={{ display: 'block', marginTop: '4px', color: '#eab308', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getFighterByUid(cardBattle.activeFighterUid, cardBattle.playerTeam, cardBattle.botTeam)?.name}>
                      {getFighterByUid(cardBattle.activeFighterUid, cardBattle.playerTeam, cardBattle.botTeam)?.name}
                    </span>
                  )}
                </div>
                {cardBattle.turn === 'player' && !cardBattle.auto && (() => {
                  const active = cardBattle.playerTeam.find(x => x.uid === cardBattle.activeFighterUid && x.hp > 0);
                  const basicName = active?.abilities.basic.name ?? 'Удар';
                  const skillName = active?.abilities.skill.name ?? 'Навык';
                  const skillCd = active?.cooldowns.skill ?? 0;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => applyCardAction('basic', 'player', cardBattle.selectedTargetUid, cardBattle.selectedAllyUid)}
                        title={basicName}
                        style={{
                          width: '100%',
                          padding: '12px 10px',
                          background: '#ea580c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: 'clamp(11px, 3.1vw, 14px)',
                          lineHeight: 1.25,
                          textAlign: 'center',
                        }}
                      >
                        <Icon3D id="arena-3d" size={24} />
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{basicName}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCardAction('skill', 'player', cardBattle.selectedTargetUid, cardBattle.selectedAllyUid)}
                        disabled={skillCd > 0}
                        title={skillName}
                        style={{
                          width: '100%',
                          padding: '12px 10px',
                          background: '#7c3aed',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 900,
                          opacity: skillCd > 0 ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: 'clamp(11px, 3.1vw, 14px)',
                          lineHeight: 1.25,
                          textAlign: 'center',
                        }}
                      >
                        <Icon3D id="levelup-3d" size={24} />
                        <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{skillName}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div style={{ marginTop: '10px', maxHeight: 'min(28vh, 160px)', overflow: 'auto', fontSize: '11px', color: '#cbd5e1', WebkitOverflowScrolling: 'touch' }}>
                {cardBattle.log.slice(-10).map((l, i) => (
                  <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(51,65,85,0.35)', wordBreak: 'break-word' }}>{l}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team / Отряд */}
      {gamePhase === 'playing' && screen === 'team' && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box' }}>
          <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>👥 ОТРЯД</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', maxWidth: '420px', margin: '16px auto 0', padding: '0 16px' }}>
            <button
              onClick={() => setScreen('artifacts')}
              style={{ padding: '14px', background: 'rgba(30,41,59,0.9)', color: '#fff', border: '1px solid #ec4899', borderRadius: '16px', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ marginBottom: '8px' }}><Icon3D id="artifacts-3d" size={40} /></div>
              <div style={cardTitleStyle('#ec4899')}>Артефакты</div>
              <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '4px' }}>Экипировка и усиления</div>
            </button>
            <button
              onClick={() => setScreen('craft')}
              style={{ padding: '14px', background: 'rgba(30,41,59,0.9)', color: '#fff', border: '1px solid #7c3aed', borderRadius: '16px', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ marginBottom: '8px' }}><Icon3D id="craft-3d" size={40} /></div>
              <div style={cardTitleStyle('#c084fc')}>Крафт</div>
              <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '4px' }}>Создание снаряжения</div>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '14px 0 18px' }}>
            <button
              onClick={() => setTeamTab('squad')}
              style={{ padding: '10px 16px', borderRadius: '9999px', border: '1px solid #334155', background: teamTab === 'squad' ? '#eab308' : '#111827', color: teamTab === 'squad' ? '#000' : '#cbd5e1', fontWeight: 900 }}
            >
              Отряд
            </button>
            <button
              onClick={() => setTeamTab('cards')}
              style={{ padding: '10px 16px', borderRadius: '9999px', border: '1px solid #334155', background: teamTab === 'cards' ? '#eab308' : '#111827', color: teamTab === 'cards' ? '#000' : '#cbd5e1', fontWeight: 900 }}
            >
              Мои карты
            </button>
          </div>

          {teamTab === 'squad' && (
            <>
              <div style={{ maxWidth: '760px', margin: '0 auto 18px', padding: '0 16px' }}>
                <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #eab308', borderRadius: '16px', padding: '14px', textAlign: 'left' }}>
                  <div style={cardTitleStyle('#eab308')}>Лидер: {mainHero?.name}</div>
                  <div style={{ ...mutedTextStyle, fontSize: '13px', marginTop: '6px' }}>
                    Lv. {mainHero?.level ?? 1} даёт картам +{Math.round((getLeaderBonus().powerMultiplier - 1) * 100)}% силы и +{Math.round((getLeaderBonus().hpMultiplier - 1) * 100)}% HP.
                    Новые PVE этапы открываются уровнем лидера.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', maxWidth: '760px', margin: '0 auto', padding: '0 12px', width: '100%', boxSizing: 'border-box' }}>
                {activeCardSquad.map(card => {
                  const buffed = getBuffedCardStats(card);
                  return (
                    <div key={card.id} style={{ minWidth: 0, background: '#0b1220', border: '1px solid #334155', borderRadius: '14px', padding: '10px 8px', textAlign: 'left', boxSizing: 'border-box' }}>
                      <div style={{ position: 'relative', width: 'min(100%, 88px)', maxWidth: '88px', aspectRatio: '1', margin: '0 auto 8px' }}>
                        <img src={getCharacterCardImageUrl(card.id)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }} alt="" />
                        <img src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} alt="" />
                      </div>
                      <div style={{ ...cardTitleStyle('#e2e8f0'), fontSize: 'clamp(11px, 3vw, 13px)', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{card.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{card.rarity} • {card.element}</div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px' }}>
                        <span>HP <b style={{ color: '#22c55e' }}>{buffed.hp}</b></span>
                        <span>PWR <b style={{ color: '#f59e0b' }}>{buffed.power}</b></span>
                      </div>
                      <div style={{ marginTop: '8px', color: '#c084fc', fontSize: '12px', fontWeight: 800 }}>
                        ✨ {card.abilities[1].name}
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, 3 - activeCardSquad.length) }, (_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: '170px', background: 'rgba(15,23,42,0.65)', border: '1px dashed #475569', borderRadius: '14px', display: 'grid', placeItems: 'center', color: '#94a3b8', padding: '12px' }}>
                    Выбери карту
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '28px' }}>
                <button onClick={() => setTeamTab('cards')} style={{ padding: '12px 22px', background: '#eab308', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 900 }}>
                  Выбрать карты
                </button>
                <button onClick={openLootbox} style={{ padding: '12px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 900, flex: '1 1 auto', minWidth: 'min(100%, 280px)', fontSize: 'clamp(12px, 3.2vw, 15px)', textAlign: 'center', flexWrap: 'wrap' }}>
                  <Icon3D id="artifacts-3d" size={32} /> Лутбокс • 1800 монет
                </button>
              </div>
            </>
          )}

          {teamTab === 'cards' && (
            <div style={{ padding: '0 12px', maxWidth: '980px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ ...metaTextStyle, marginBottom: '12px', fontSize: 'clamp(12px, 3.2vw, 14px)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                Карты в коллекции: <b style={{ color: '#22c55e' }}>{Object.values(collection).reduce((a, b) => a + b, 0)}</b> • Уникальных: <b style={{ color: '#eab308' }}>{Object.keys(collection).filter(k => (collection[k] ?? 0) > 0).length}</b> • Осколки: <b style={{ color: '#c084fc' }}>{cardShards}</b>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px', marginBottom: '16px' }}>
                {(Object.entries(CARD_PACKS) as Array<[CardPackType, typeof CARD_PACKS[CardPackType]]>).map(([packType, pack]) => (
                  <button
                    key={packType}
                    type="button"
                    onClick={() => openCharacterPack(packType)}
                    style={{ padding: '14px', minWidth: 0, background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.8))', border: '1px solid #a855f7', borderRadius: '16px', color: '#fff', textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <div style={cardTitleStyle('#c084fc')}>🎴 {pack.name}</div>
                    <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '6px' }}>
                      {pack.cards} карт • {pack.costCoins != null ? `${pack.costCoins} монет` : `${pack.costCrystals} кристаллов`}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #334155', borderRadius: '16px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                <div style={{ ...cardTitleStyle('#eab308'), marginBottom: '10px' }}>Крафт новых карт</div>
                <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
                  Дубликаты из наборов превращаются в осколки. Осколками можно создать карту, которой ещё нет в коллекции.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', maxHeight: '280px', overflow: 'auto' }}>
                  {getCraftableCards(collection)
                    .slice(0, 12)
                    .map(card => {
                      const cost = CARD_CRAFT_COST[card.rarity];
                      const canCraft = cardShards >= cost;
                      return (
                        <div key={card.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ position: 'relative', width: '56px', height: '56px', flex: '0 0 56px', opacity: 0.7 }}>
                            <img src={getCharacterCardImageUrl(card.id)} style={{ position: 'absolute', inset: 0, width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', filter: 'grayscale(0.7)' }} alt="" />
                            <img src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '56px', height: '56px' }} alt="" />
                          </div>
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{card.rarity} • цена {cost} осколков</div>
                          </div>
                          <button
                            onClick={() => craftCharacterCard(card)}
                            disabled={!canCraft}
                            style={{ padding: '8px 10px', borderRadius: '10px', border: 'none', background: canCraft ? '#eab308' : '#334155', color: canCraft ? '#000' : '#94a3b8', fontWeight: 900, cursor: canCraft ? 'pointer' : 'not-allowed' }}
                          >
                            Крафт
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #7c3aed', borderRadius: '16px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                <div style={{ ...cardTitleStyle('#c084fc'), marginBottom: '10px' }}>Обмен редкости</div>
                <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
                  Выбери конкретные 5 карт одной редкости и обменяй их на 1 случайную карту редкостью выше.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '10px' }}>
                  {(['Common', 'Rare', 'Epic', 'Legendary'] as CardRarity[]).map(rarity => {
                    const ownedCount = getRarityUpgradePool(collection, rarity).reduce((sum, card) => sum + (collection[card.id] ?? 0), 0);
                    const targetRarity = CARD_RARITY_UPGRADE_TARGET[rarity];
                    const active = selectedExchangeRarity === rarity;
                    return (
                      <button
                        key={rarity}
                        onClick={() => selectExchangeRarity(rarity)}
                        style={{
                          padding: '12px',
                          background: active ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#111827',
                          color: active ? '#fff' : '#cbd5e1',
                          border: active ? '2px solid #eab308' : '1px solid #7c3aed',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 950, fontSize: '13px' }}>{rarity} → {targetRarity}</div>
                        <div style={{ marginTop: '5px', fontSize: '12px' }}>{ownedCount}/{CARD_RARITY_UPGRADE_COST} карт</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: '12px', color: '#e2e8f0', fontSize: '13px', fontWeight: 900 }}>
                  Выбрано: {selectedExchangeCardIds.length}/{CARD_RARITY_UPGRADE_COST} • {selectedExchangeRarity} → {CARD_RARITY_UPGRADE_TARGET[selectedExchangeRarity]}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '10px', maxHeight: '260px', overflow: 'auto' }}>
                  {getRarityUpgradePool(collection, selectedExchangeRarity).map(card => {
                    const ownedCount = collection[card.id] ?? 0;
                    const selectedCount = selectedExchangeCardIds.filter(id => id === card.id).length;
                    return (
                      <div key={card.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: selectedCount > 0 ? 'rgba(124,58,237,0.22)' : '#0b1220', border: selectedCount > 0 ? '1px solid #a855f7' : '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
                        <div style={{ position: 'relative', width: '54px', height: '54px', flex: '0 0 54px' }}>
                          <img src={getCharacterCardImageUrl(card.id)} style={{ position: 'absolute', inset: 0, width: '54px', height: '54px', borderRadius: '12px', objectFit: 'cover' }} alt="" />
                          <img src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '54px', height: '54px' }} alt="" />
                        </div>
                        <button
                          onClick={() => toggleExchangeCard(card)}
                          style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}
                        >
                          <div style={{ fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Есть ×{ownedCount} • выбрано ×{selectedCount}</div>
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => removeExchangeCopy(card.id)} disabled={selectedCount <= 0} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: selectedCount > 0 ? '#ef4444' : '#334155', color: '#fff', fontWeight: 900, cursor: selectedCount > 0 ? 'pointer' : 'not-allowed' }}>-</button>
                          <button onClick={() => addExchangeCopy(card)} disabled={selectedExchangeCardIds.length >= CARD_RARITY_UPGRADE_COST || selectedCount >= ownedCount} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: selectedExchangeCardIds.length < CARD_RARITY_UPGRADE_COST && selectedCount < ownedCount ? '#22c55e' : '#334155', color: '#fff', fontWeight: 900, cursor: selectedExchangeCardIds.length < CARD_RARITY_UPGRADE_COST && selectedCount < ownedCount ? 'pointer' : 'not-allowed' }}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={upgradeSelectedCardsByRarity}
                  disabled={selectedExchangeCardIds.length !== CARD_RARITY_UPGRADE_COST}
                  style={{ marginTop: '12px', width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? '#eab308' : '#334155', color: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? '#000' : '#94a3b8', fontWeight: 950, cursor: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? 'pointer' : 'not-allowed' }}
                >
                  Обменять выбранные карты
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '12px' }}>
                {CHARACTER_CARDS
                  .filter(c => (collection[c.id] ?? 0) > 0)
                  .sort((a, b) => {
                    const da = CARD_RARITY_ORDER[a.rarity] ?? 0;
                    const db = CARD_RARITY_ORDER[b.rarity] ?? 0;
                    if (da !== db) return db - da;
                    return a.name.localeCompare(b.name, 'ru');
                  })
                  .map(card => {
                    const count = collection[card.id] ?? 0;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => toggleCardInSquad(card.id)}
                        style={{ minWidth: 0, background: '#0b1220', border: cardSquadIds.includes(card.id) ? '2px solid #eab308' : '1px solid #334155', borderRadius: '14px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', cursor: 'pointer', color: '#e2e8f0', boxSizing: 'border-box' }}
                      >
                        <div style={{ position: 'relative', width: '64px', height: '64px', flex: '0 0 64px' }}>
                          <img src={getCharacterCardImageUrl(card.id)} style={{ position: 'absolute', inset: 0, width: '64px', height: '64px', borderRadius: '14px' }} alt="" />
                          <img src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '64px', height: '64px' }} alt="" />
                          <div style={{ position: 'absolute', right: '-6px', bottom: '-6px', background: '#111827', border: '1px solid #334155', borderRadius: '9999px', padding: '3px 8px', fontSize: '12px', fontWeight: 900, color: '#e2e8f0' }}>
                            ×{count}
                          </div>
                        </div>

                        <div style={{ textAlign: 'left', minWidth: 0, flex: '1 1 auto' }}>
                          <div style={{ fontWeight: 900, color: '#e2e8f0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {card.rarity} • {card.element} • {card.kind}
                          </div>
                          <div style={{ marginTop: '6px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: '#cbd5e1' }}>
                            <span>HP <b style={{ color: '#22c55e' }}>{card.hp}</b></span>
                            <span>PWR <b style={{ color: '#f59e0b' }}>{card.power}</b></span>
                            <span>SPD <b style={{ color: '#60a5fa' }}>{card.speed}</b></span>
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                            ✨ {card.abilities[1].name} • {card.abilities[1].kind}
                          </div>
                          {cardSquadIds.includes(card.id) && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: '#eab308', fontWeight: 900 }}>В боевом отряде</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Farm */}
      {gamePhase === 'playing' && screen === 'farm' && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box', paddingLeft: '12px', paddingRight: '12px' }}>
          <h1 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5.5vw, 36px)' }}>🌾 HOLD GFT</h1>
          <div style={{ margin: '20px auto', maxWidth: '360px', width: '100%', background: 'rgba(0,0,0,0.75)', padding: 'clamp(16px, 4vw, 30px)', borderRadius: '20px', border: '2px solid #eab308', boxSizing: 'border-box' }}>
            <p style={{ ...mutedTextStyle, margin: '0 0 8px' }}>Ставка за 6 часов</p>
            <p style={{ fontSize: 'clamp(28px, 9vw, 42px)', fontWeight: 950, color: '#22c55e', margin: 0, textShadow: '0 0 18px rgba(34,197,94,0.75), 0 4px 12px rgba(0,0,0,0.8)' }}>
              +{(HOLD_REWARD_RATE * (1 + nftBonuses.holdRewardBonus) * 100).toFixed(2)}%
            </p>
            <p style={{ ...mutedTextStyle, margin: '10px 0 0', fontSize: '12px' }}>
              Доступно: <b style={{ color: '#facc15' }}>{balance.toFixed(2)} GFT</b>
            </p>
            <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
              {nftBonuses.collections.map(collection => (
                <div key={collection.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', borderRadius: '12px', background: collection.owned ? 'rgba(34,197,94,0.14)' : 'rgba(15,23,42,0.78)', border: `1px solid ${collection.owned ? '#22c55e' : '#334155'}`, color: collection.owned ? '#bbf7d0' : '#94a3b8', fontSize: 'clamp(10px, 2.8vw, 12px)', fontWeight: 900, textAlign: 'left' }}>
                  <span style={{ minWidth: 0, wordBreak: 'break-word' }}>{collection.name}</span>
                  <span style={{ flexShrink: 0, textAlign: 'right' }}>{collection.owned ? `x${collection.count} • +${Math.round(collection.holdRewardBonus * 100)}%` : collection.available ? 'нет NFT' : 'скоро'}</span>
                </div>
              ))}
            </div>
            <p style={{ ...mutedTextStyle, margin: '12px 0 0', fontSize: '11px' }}>
              Игровые награды PVP/PVE: +{Math.round(nftBonuses.gameRewardBonus * 100)}%
            </p>
          </div>
          {!holdEndTime ? (
            <div style={{ display: 'grid', gap: '14px', maxWidth: '360px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <input
                type="number"
                min="1"
                max={balance}
                value={holdAmountInput}
                onChange={event => setHoldAmountInput(event.target.value)}
                placeholder="Сумма GFT"
                style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid #f59e0b', background: '#0f172a', color: '#fff', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: 900, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={{ ...mutedTextStyle, fontSize: 'clamp(12px, 3.2vw, 13px)', wordBreak: 'break-word' }}>
                Ожидаемый доход: <b style={{ color: '#22c55e' }}>+{(Math.max(0, Number(holdAmountInput) || 0) * HOLD_REWARD_RATE * (1 + nftBonuses.holdRewardBonus)).toFixed(2)} GFT</b>
              </div>
              <button type="button" disabled={holdBusy} onClick={startHold} style={{ padding: '14px 18px', background: holdBusy ? '#64748b' : 'linear-gradient(90deg, #eab308, #f59e0b)', color: '#000', border: 'none', borderRadius: '9999px', fontSize: 'clamp(14px, 3.8vw, 20px)', fontWeight: '900', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: holdBusy ? 0.75 : 1, width: '100%', flexWrap: 'wrap', textAlign: 'center' }}>
                <Icon3D id="farm-3d" size={36} /> {holdBusy ? 'Проверяем сервер...' : 'Заморозить GFT на 6 ч.'}
              </button>
            </div>
          ) : (
            <div style={{ margin: '30px auto', padding: '25px', background: 'rgba(234,179,8,0.15)', border: '3px solid #eab308', borderRadius: '20px', maxWidth: '360px' }}>
              <div style={{ ...mutedTextStyle, marginBottom: '8px' }}>Заморожено: <b style={{ color: '#facc15' }}>{holdLockedGft.toFixed(2)} GFT</b></div>
              <div style={{ fontSize: '56px', fontWeight: '900' }}>
                {Math.max(0, Math.floor((holdEndTime - now) / 60000))}:{String(Math.max(0, Math.floor(((holdEndTime - now) % 60000) / 1000))).padStart(2, '0')}
              </div>
              <div style={{ color: '#22c55e', fontSize: '26px' }}>+{holdEarnings.toFixed(2)} GFT</div>
              <div style={{ ...mutedTextStyle, marginTop: '8px', fontSize: '12px' }}>Ставка зафиксирована сервером: +{(holdRewardRate * 100).toFixed(2)}%</div>
              <div style={{ ...mutedTextStyle, marginTop: '8px', fontSize: '12px' }}>После окончания вернётся депозит + начисленный процент.</div>
            </div>
          )}
        </div>
      )}

      {/* Прокачка героя */}
      {gamePhase === 'playing' && screen === 'levelup' && mainHero && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box', paddingLeft: '12px', paddingRight: '12px' }}>
          <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>📈 ПРОКАЧКА</h2>
          
          <div style={{ margin: '24px auto', maxWidth: '360px', width: '100%', boxSizing: 'border-box' }}>
            <img src={mainHero.image} style={{ width: '100%', borderRadius: '16px', marginBottom: '20px' }} alt="" />
            <h3 style={heroNameStyle}>{mainHero.name}</h3>
            <p style={metaTextStyle}>Lv. {mainHero.level} • ★{mainHero.stars}</p>
            <div style={{ background: '#1e2937', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>⚡ Сила: {mainHero.basePower}</div>
              <div style={{ color: '#94a3b8', marginTop: '8px' }}>HP: {mainHero.basePower * 10}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '15px', padding: '0', maxWidth: '360px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {/* Прокачка Силы */}
            <div style={{ background: '#1e2937', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '16px', border: '2px solid #f59e0b', boxSizing: 'border-box' }}>
              <div style={{ ...cardTitleStyle('#f59e0b'), fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '12px' }}>⚡ Повысить Силу</div>
              <div style={{ ...mutedTextStyle, marginBottom: '12px' }}>+5 урона | Стоимость: 900 монет</div>
              <button 
                onClick={() => levelUp('power')}
                style={{ width: '100%', padding: '10px 12px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Icon3D id="levelup-3d" size={30} /> Прокачить
              </button>
            </div>

            {/* Прокачка Уровня */}
            <div style={{ background: '#1e2937', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '16px', border: '2px solid #3b82f6', boxSizing: 'border-box' }}>
              <div style={{ ...cardTitleStyle('#3b82f6'), fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '12px' }}>📊 Повысить Уровень</div>
              <div style={{ ...mutedTextStyle, marginBottom: '12px' }}>+1 уровень | Стоимость: 650 монет</div>
              <button 
                onClick={() => levelUp('hp')}
                style={{ width: '100%', padding: '10px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Icon3D id="levelup-3d" size={30} /> Прокачить
              </button>
            </div>

            {/* Прокачка Звёзд */}
            <div style={{ background: '#1e2937', padding: 'clamp(14px, 4vw, 20px)', borderRadius: '16px', border: '2px solid #ec4899', boxSizing: 'border-box' }}>
              <div style={{ ...cardTitleStyle('#ec4899'), fontSize: 'clamp(16px, 4vw, 20px)', marginBottom: '12px' }}>⭐ Повысить Редкость</div>
              <div style={{ ...mutedTextStyle, marginBottom: '12px' }}>+1 звезда {mainHero.stars < 6 ? `(${mainHero.stars}/6)` : '(Макс)'} | Стоимость: 120 кристаллов</div>
              <button 
                onClick={() => levelUp('stars')}
                disabled={mainHero.stars >= 6}
                style={{ width: '100%', padding: '10px 12px', background: mainHero.stars >= 6 ? '#475569' : '#ec4899', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: mainHero.stars >= 6 ? 'not-allowed' : 'pointer', opacity: mainHero.stars >= 6 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Icon3D id="levelup-3d" size={30} /> {mainHero.stars >= 6 ? 'Максимум' : 'Прокачить'}
              </button>
            </div>
          </div>

          <div style={{ ...metaTextStyle, marginTop: '40px', fontSize: '18px' }}>
            Монеты: <span style={{ color: '#facc15', fontWeight: 'bold' }}>{coins}</span> • Кристаллы: <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{crystals}</span>
          </div>
        </div>
      )}

      {/* Артефакты */}
      {gamePhase === 'playing' && (screen === 'artifacts' || selectedArtifact) && (
        <ArtifactsScreen
          background={getBackground()}
          contentInset={mainScrollPadding}
          headerOffsetPx={mainInsets.top}
          materials={materials}
          balance={crystals}
          artifacts={artifacts}
          filteredArtifacts={filteredArtifacts}
          artifactStats={artifactStats}
          equippedArtifacts={equippedArtifacts}
          selectedArtifact={selectedArtifact}
          artifactTypeFilter={artifactTypeFilter}
          artifactRarityFilter={artifactRarityFilter}
          setScreen={setScreen}
          setSelectedArtifact={setSelectedArtifact}
          setArtifactTypeFilter={setArtifactTypeFilter}
          setArtifactRarityFilter={setArtifactRarityFilter}
          equipArtifact={equipArtifact}
          upgradeArtifact={upgradeArtifact}
          dismantleArtifact={dismantleArtifact}
          toggleArtifactLock={toggleArtifactLock}
          unequipArtifact={unequipArtifact}
        />
      )}

      {/* Мастерская крафта */}
      {gamePhase === 'playing' && screen === 'craft' && (
        <CraftScreen
          background={getBackground()}
          contentInset={mainScrollPadding}
          materials={materials}
          balance={crystals}
          craftArtifact={craftArtifact}
          setScreen={setScreen}
        />
      )}

      {/* Shop / Магазин */}
      {gamePhase === 'playing' && screen === 'shop' && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box' }}>
          <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>🛒 МАГАЗИН</h2>
          <div style={{ padding: '0 16px', marginBottom: '20px' }}>
            <p
              style={{
                ...metaTextStyle,
                color: '#e2e8f0',
                margin: '0 auto',
                maxWidth: '1040px',
                padding: '12px 14px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                textAlign: 'center',
                background: 'rgba(15,23,42,0.94)',
                border: '1px solid rgba(148,163,184,0.35)',
                borderRadius: '16px',
                boxShadow: '0 14px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                textShadow: 'none',
                fontSize: 'clamp(12px, 3.1vw, 14px)',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              💰 <span style={{ color: '#fde68a' }}>{balance}</span> GFT <span style={{ color: '#64748b' }}>|</span> 💎 <span style={{ color: '#a5b4fc' }}>{crystals}</span> кристаллов <span style={{ color: '#64748b' }}>|</span> 🪙 <span style={{ color: '#fcd34d' }}>{coins}</span> монет <span style={{ color: '#64748b' }}>|</span> 🧩 <span style={{ color: '#f0abfc' }}>{cardShards}</span> осколков <span style={{ color: '#64748b' }}>|</span> 📦 <span style={{ color: '#86efac' }}>{materials}</span> материалов
            </p>
          </div>

          <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 12px', display: 'grid', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
            <section style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #7c3aed', borderRadius: '16px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ ...cardTitleStyle('#c084fc'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🎴 Наборы карт</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '8px' }}>
                {(Object.entries(CARD_PACKS) as Array<[CardPackType, typeof CARD_PACKS[CardPackType]]>).map(([packType, pack]) => (
                  <button
                    key={packType}
                    onClick={() => openCharacterPack(packType)}
                    style={{ padding: '10px 11px', background: 'linear-gradient(135deg, #1e293b, #581c87)', color: '#fff', border: '1px solid #a855f7', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 950, fontSize: 'clamp(12px, 3vw, 14px)' }}>{pack.name}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>
                      {pack.cards} карт • {pack.costCoins != null ? `${pack.costCoins} монет` : `${pack.costCrystals} кристаллов`}
                    </div>
                    <div style={{ color: '#a5b4fc', fontSize: '10px', marginTop: '5px', lineHeight: 1.3 }}>Дубликаты дают осколки</div>
                  </button>
                ))}
              </div>
            </section>

            <section style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #22c55e', borderRadius: '16px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ ...cardTitleStyle('#22c55e'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🪙 Игровые ресурсы</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '8px' }}>
                <button type="button" onClick={openLootbox} style={{ padding: '10px 11px', minWidth: 0, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🎁 Артефактный лутбокс</div>
                  <div style={{ fontSize: '11px', color: '#ddd6fe', marginTop: '4px', lineHeight: 1.3 }}>1800 монет • артефакт + материалы</div>
                </button>
                <button type="button" onClick={() => { if (spendCoins(900)) { setEnergy(maxEnergy); alert('✅ Энергия восстановлена.'); } }} style={{ padding: '10px 11px', minWidth: 0, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>⚡ Полная энергия</div>
                  <div style={{ fontSize: '11px', color: '#bae6fd', marginTop: '4px', lineHeight: 1.3 }}>900 монет • {maxEnergy}/{maxEnergy}</div>
                </button>
                <button type="button" onClick={() => { if (spendCoins(1400)) { setMaterials(m => m + 100); alert('✅ +100 материалов.'); } }} style={{ padding: '10px 11px', minWidth: 0, background: '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>📦 100 материалов</div>
                  <div style={{ fontSize: '11px', color: '#bbf7d0', marginTop: '4px', lineHeight: 1.3 }}>1400 монет • для крафта</div>
                </button>
                <button type="button" onClick={() => { if (spendCrystals(700)) { setCardShards(s => s + 50); alert('✅ +50 карточных осколков.'); } }} style={{ padding: '10px 11px', minWidth: 0, background: '#c026d3', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🧩 50 осколков</div>
                  <div style={{ fontSize: '11px', color: '#f5d0fe', marginTop: '4px', lineHeight: 1.3 }}>700 кристаллов • для крафта карт</div>
                </button>
              </div>
            </section>

            <section style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #facc15', borderRadius: '16px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ ...cardTitleStyle('#facc15'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>🪙 Монеты для free-to-play</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 124px), 1fr))', gap: '8px' }}>
                <button type="button" onClick={() => buyCoinsWithCrystals(3000, 120)} style={{ padding: '10px 11px', minWidth: 0, background: '#ca8a04', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🪙 3000 монет</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>120 кристаллов</div>
                </button>
                <button type="button" onClick={() => buyCoinsWithCrystals(9000, 320)} style={{ padding: '10px 11px', minWidth: 0, background: '#eab308', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🪙 9000 монет</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>320 кристаллов • выгодно</div>
                </button>
                <button type="button" onClick={() => buyCoinsWithGFT(18000, 35)} style={{ padding: '10px 11px', minWidth: 0, background: '#f59e0b', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🪙 18000 монет</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>35 GFT</div>
                </button>
                <button type="button" onClick={() => buyCoinsWithGFT(60000, 100)} style={{ padding: '10px 11px', minWidth: 0, background: '#fbbf24', color: '#111827', border: 'none', borderRadius: '12px', fontWeight: 950, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🪙 60000 монет</div>
                  <div style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.3 }}>100 GFT • максимум</div>
                </button>
              </div>
            </section>

            <section style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #ec4899', borderRadius: '16px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ ...cardTitleStyle('#ec4899'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>💎 Премиум</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '8px' }}>
                <button type="button" onClick={() => openPremiumCharacterPack('premium')} style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #be185d, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🎴 Премиум набор</div>
                  <div style={{ fontSize: '11px', color: '#fce7f3', marginTop: '4px', lineHeight: 1.3 }}>75 GFT • 5 карт</div>
                </button>
                <button type="button" onClick={() => openPremiumCharacterPack('mythic')} style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #f59e0b, #7c2d12)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>🔥 Мифический набор</div>
                  <div style={{ fontSize: '11px', color: '#ffedd5', marginTop: '4px', lineHeight: 1.3 }}>180 GFT • высокий шанс редких карт</div>
                </button>
                <button type="button" onClick={() => { if (spendGFT(60)) { setMaterials(m => m + 220); setCardShards(s => s + 75); alert('✅ Премиум ресурсы получены.'); } }} style={{ padding: '10px 11px', minWidth: 0, background: 'linear-gradient(135deg, #0891b2, #312e81)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, textAlign: 'left', cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(11px, 2.85vw, 13px)' }}>
                  <div>⚒️ Набор крафтера</div>
                  <div style={{ fontSize: '11px', color: '#cffafe', marginTop: '4px', lineHeight: 1.3 }}>60 GFT • материалы + осколки</div>
                </button>
              </div>
            </section>

            <section style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #6366f1', borderRadius: '16px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ ...cardTitleStyle('#a5b4fc'), marginBottom: '8px', fontSize: 'clamp(11px, 2.8vw, 14px)' }}>💎 Покупка кристаллов за GFT</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 118px), 1fr))', gap: '8px' }}>
                {[
                  { gft: 50, crystals: 500, bonus: 0 },
                  { gft: 150, crystals: 1650, bonus: 150 },
                  { gft: 500, crystals: 6000, bonus: 1000 },
                  { gft: 1200, crystals: 15000, bonus: 3000 },
                ].map(pkg => (
                  <button
                    key={pkg.gft}
                    type="button"
                    onClick={() => buyCrystalsWithGFT(pkg.crystals, pkg.gft)}
                    style={{ padding: '9px 10px', minWidth: 0, background: pkg.bonus > 0 ? '#ec4899' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', boxSizing: 'border-box', fontSize: 'clamp(10px, 2.75vw, 13px)' }}
                  >
                    <div>{pkg.crystals} кристаллов</div>
                    <div style={{ fontSize: '11px', opacity: 0.88, marginTop: '3px', lineHeight: 1.3 }}>{pkg.gft} GFT{pkg.bonus > 0 ? ` • +${pkg.bonus} бонус` : ''}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {onboardingStep !== null && ONBOARDING_STEPS[onboardingStep] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 350,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
            background: 'rgba(2, 6, 23, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.45)',
              borderRadius: '20px',
              padding: '20px 18px 16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 40px rgba(234, 179, 8, 0.12)',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
              <h2
                id="onboarding-title"
                style={{
                  margin: 0,
                  fontSize: 'clamp(18px, 4.2vw, 22px)',
                  fontWeight: 950,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#fde68a',
                  lineHeight: 1.2,
                }}
              >
                {ONBOARDING_STEPS[onboardingStep].title}
              </h2>
              <button
                type="button"
                onClick={finishOnboarding}
                style={{
                  flexShrink: 0,
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  background: 'rgba(15,23,42,0.9)',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                Пропустить
              </button>
            </div>
            <p
              style={{
                margin: '0 0 18px',
                fontSize: 'clamp(14px, 3.4vw, 16px)',
                lineHeight: 1.5,
                color: '#e2e8f0',
                fontWeight: 500,
              }}
            >
              {ONBOARDING_STEPS[onboardingStep].body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
              {ONBOARDING_STEPS.map((_, i) => (
                <span
                  key={`onb-dot-${i}`}
                  style={{
                    width: i === onboardingStep ? '20px' : '8px',
                    height: '8px',
                    borderRadius: '999px',
                    background: i === onboardingStep ? '#eab308' : 'rgba(148, 163, 184, 0.45)',
                    transition: 'width 0.2s ease',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setOnboardingStep(s => (s! > 0 ? s! - 1 : 0))}
                style={{
                  padding: '12px 16px',
                  minWidth: '100px',
                  fontWeight: 800,
                  fontSize: '15px',
                  color: '#cbd5e1',
                  background: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid #64748b',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  opacity: onboardingStep > 0 ? 1 : 0.4,
                  pointerEvents: onboardingStep > 0 ? 'auto' : 'none',
                }}
              >
                Назад
              </button>
              {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setOnboardingStep(s => s! + 1)}
                  style={{
                    padding: '12px 20px',
                    minWidth: '120px',
                    fontWeight: 900,
                    fontSize: '15px',
                    color: '#0f172a',
                    background: 'linear-gradient(180deg, #fde68a, #eab308)',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    boxShadow: '0 4px 16px rgba(234, 179, 8, 0.35)',
                  }}
                >
                  Далее
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishOnboarding}
                  style={{
                    padding: '12px 20px',
                    minWidth: '120px',
                    fontWeight: 900,
                    fontSize: '15px',
                    color: '#0f172a',
                    background: 'linear-gradient(180deg, #86efac, #22c55e)',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
                  }}
                >
                  В игру
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {grantToasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          {grantToasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <SingleGrantToast id={t.id} message={t.message} onDismiss={removeGrantToast} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}