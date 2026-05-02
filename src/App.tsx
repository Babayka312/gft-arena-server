import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from 'react';
import { getTelegramUserDisplayName, getTelegramWebApp, openExternalLink } from './telegram';
import { hapticImpact, hapticNotification } from './telegram-haptic';
import {
  gftCreateDeposit,
  gftVerifyDeposit,
  gftCreateWithdraw,
  gftListWithdraws,
  xamanCreateSignIn,
  xamanGetPayload,
  type GftWithdrawEntry,
} from './xaman';
import { getNftBonusesForPlayer, getXrpBalance, type NftBonuses } from './xrplClient';
import { getPvpOpponentAvatarUrl, getZodiacAvatarUrl } from './zodiacAvatars';
import { getRarityFrameUrl } from './ui/rarityFrames';
import { Icon3D } from './ui/Icon3D';
import { BattleVfxOverlay, type BattleVfx } from './ui/BattleVfxOverlay';
import { CHARACTER_CARDS } from './cards/catalog';
import type { CardAbility, CardElement, CardRarity, CharacterCard } from './cards/catalog';
import { getElementMatchupMultiplier, getElementMatchupSign } from './game/elementMatchup';
import { getHeroUltPattern, getHeroUltPower, getHeroUltimateTitle } from './game/heroUltimate';
import { getCharacterCardImageSrcSet, getCharacterCardImageUrl } from './cards/images';
import {
  CARD_CRAFT_COST,
  CARD_PACKS,
  CARD_RARITY_ORDER,
  CARD_RARITY_UPGRADE_COST,
  CARD_RARITY_UPGRADE_TARGET,
  CARD_STAR_MAX,
  CARD_STAR_UP_COST,
  getCraftableCards,
  getRarityUpgradePool,
  openCardPack,
  rollRarityUpgradeReward,
  type CardPackType,
} from './cards/acquisition';
import { registerPlayer } from './playerRegistry';
import { ARTIFACT_RARITIES, ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES, BONUS_LABELS, CRAFT_RECIPES, RARITY_CONFIG } from './artifacts/balance';
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
import { ArtifactIconForArtifact } from './artifacts/ArtifactIcon';
import { VirtualizedCardCollectionList } from './components/VirtualizedCardCollectionList';
import { TopBar } from './components/ui/TopBar';
import { BottomNav } from './components/ui/BottomNav';
import { WalletPanel } from './components/ui/WalletPanel';
import { Background } from './components/ui/Background';
import { BattleScreen } from './screens/BattleScreen';
import { BG_PATHS, BACKGROUND_PREFETCH } from './ui/backgrounds';
import {
  createCardUid,
  generatePveEnemy,
  randomItem,
  randomRange,
  rollBotAbility,
  type SquadHero,
} from './game/battle';
import { resolveCardBattleBotMultiplier } from './game/calculations';
import { getBattleEnergyCost, MAX_ENERGY, regenEnergyToNow } from './game/energy';
import { createBattleCardUid, createPvpRng } from './game/pvpRng';
import {
  ackPlayerClientNotices,
  bindPlayerReferralCode,
  claimPlayerReferralTier,
  claimReferralCommissions,
  claimPlayerBattleReward,
  claimPlayerDailyReward,
  claimPlayerHold,
  upgradePlayerCardStar,
  fetchPlayerReferrals,
  fetchOnlineReferrals,
  loadPlayerProgress,
  openPlayerCardPack,
  savePlayerProgressResilient,
  flushPendingProgressSave,
  sendPlayerPresenceHeartbeat,
  fetchPvpOpponents,
  refreshPlayerPvpOpponents,
  startPlayerBattleSession,
  startPlayerHold,
} from './playerProgress';
import type {
  ClientProgressNotice,
  OnlineReferralRow,
  PvpOpponentInfo,
  PvpRefreshMeta,
  ReferralSnapshot,
} from './playerProgress';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import {
  createXrpCoinPurchase,
  fetchShopCoinPacks,
  getTonShopTransaction,
  verifyTonShopPurchase,
  verifyXrpCoinPurchase,
  type ShopCoinPacksResponse,
} from './shopCoinPacks';
import { API_BASE } from './apiConfig';
import { publicAssetUrl } from './utils/publicAssetUrl';
import {
  BATTLEPASS_PRICE_GFT,
  BATTLEPASS_QUESTS,
  BATTLEPASS_TIERS,
  BATTLEPASS_XP_PER_LEVEL,
  createBattlePassProgress,
  type BattlePassQuestKind,
  type BattlePassReward,
  type BattlePassTier,
} from './game/battlePassConfig';
import type { ArenaSubScreen } from './screens/ArenaScreen';
import { type ArenaRankingEntry, type ArenaRankingPeriod } from './game/arenaConfig';

const ArenaScreen = lazy(() => import('./screens/ArenaScreen').then((m) => ({ default: m.ArenaScreen })));
const ArtifactsScreen = lazy(() => import('./screens/ArtifactsScreen').then((m) => ({ default: m.ArtifactsScreen })));
const CraftScreen = lazy(() => import('./screens/CraftScreen').then((m) => ({ default: m.CraftScreen })));
const FarmScreen = lazy(() => import('./screens/FarmScreen').then((m) => ({ default: m.FarmScreen })));
const LevelUpScreen = lazy(() => import('./screens/LevelUpScreen').then((m) => ({ default: m.LevelUpScreen })));
const BattlePassScreen = lazy(() => import('./screens/BattlePassScreen').then((m) => ({ default: m.BattlePassScreen })));
const ShopScreen = lazy(() => import('./screens/ShopScreen').then((m) => ({ default: m.ShopScreen })));
const ShopXrpSubscreen = lazy(() => import('./screens/ShopCryptoSubscreens').then((m) => ({ default: m.ShopXrpSubscreen })));
const ShopTonSubscreen = lazy(() => import('./screens/ShopCryptoSubscreens').then((m) => ({ default: m.ShopTonSubscreen })));
const ReferralsScreen = lazy(() => import('./screens/ReferralsScreen').then((m) => ({ default: m.ReferralsScreen })));
const GFTWalletScreen = lazy(() => import('./screens/GFTWalletScreen').then((m) => ({ default: m.GFTWalletScreen })));
const EconomyDashboard = lazy(() => import('./screens/admin/EconomyDashboard').then((m) => ({ default: m.EconomyDashboard })));
const AdminLogin = lazy(() => import('./screens/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('./screens/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

type Screen =
  | 'home'
  | 'arena'
  | 'team'
  | 'referrals'
  | 'farm'
  | 'shop'
  | 'shopXrp'
  | 'shopTon'
  | 'levelup'
  | 'artifacts'
  | 'craft'
  | 'battlepass'
  | 'gftWallet'
  | 'economyDashboard'
  | 'adminLogin'
  | 'adminDashboard';
type GamePhase = 'loading' | 'create' | 'playing';

type MainHero = SquadHero;

type CardAbilityKey = 'basic' | 'skill';
/** Журнал PvP: ход карты или бонусный ульт героя */
type PvpBattleMoveAbility = CardAbilityKey | 'heroUlt';
type CardBattleTurn = 'player' | 'bot' | 'ended';

type CardFighter = {
  uid: string;
  name: string;
  role: string;
  emoji: string;
  image: string;
  rarity?: string;
  element: CardElement;
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
  /** Звёзды карты (только для бойцов игрока). У бота не задано. */
  stars?: number;
};

type CardBattleState = {
  sessionId: string;
  opponent: {
    id: number;
    name: string;
    power: number;
    maxHP: number;
    /** PvP и прочие без картинки */
    emoji?: string;
    /** PvE-противник: портрет из /images/pve/ */
    portrait?: string;
  };
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
  autoSpeed: AutoSpeed;
  log: string[];
  damagePopups: Array<{ id: number; targetUid: string; amount: number; kind: 'damage' | 'heal' | 'crit' }>;
  /**
   * Последний удар: трасса от атакующего к цели + локальный shake цели.
   * Заполняется внутри `applyCardAction`, очищается через `BATTLE_TRACER_DURATION_MS`.
   * Phase 1 редизайна: вместо фуллскрин-VFX по каждому ходу даём «локальный удар»,
   * фуллскрин остаётся только для скиллов/критов/добиваний.
   */
  lastAttack?: {
    id: number;
    fromUid: string;
    toUid: string;
    kind: CardAbility['kind'];
    side: 'player' | 'bot';
  } | null;
  /**
   * Последний KO: триггерит shake арены и крупный popup на бойце.
   * Phase 2 редизайна.
   */
  lastKo?: {
    id: number;
    uid: string;
    side: 'player' | 'bot';
    name: string;
  } | null;
  /**
   * «Слоумо»-финишер: вместо мгновенного перехода к экрану наград показываем
   * фуллскрин-баннер ~1.1 сек, чтобы игрок успел отрефлексировать исход боя.
   * Заполняется при добивании последнего бойца, очищается после endCardBattle.
   * Phase 2 редизайна.
   */
  pendingFinish?: {
    result: 'win' | 'lose';
    startedAt: number;
  } | null;
  /** Заряд ульты главного героя: +1 за каждый завершённый ход карты игрока (basic/skill), макс 4 */
  heroUltCharges?: number;
  /** PvP: журнал для серверной проверки рейтинга */
  pvpMoves?: Array<{
    side: 'player' | 'bot';
    ability: PvpBattleMoveAbility;
    attackerUid: string;
    targetUid: string | null;
    allyUid: string | null;
  }>;
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

// Phase 3 ребаланса. ВАЖНО: эти константы должны совпадать со server/pvpBattleReplay.mjs,
// иначе серверная проверка PvP-журнала разойдётся с клиентом и легитимные победы будут
// отклоняться. См. подробности в pvpBattleReplay.mjs (тот же блок).
const BATTLE_DAMAGE_MULTIPLIER = 1.85;
const BATTLE_SUPPORT_MULTIPLIER = 0.62;
const BATTLE_DOT_IMMEDIATE_MULTIPLIER = 0.9;
const BATTLE_DOT_TICK_MULTIPLIER = 0.55;
const BATTLE_CRIT_CHANCE = 0.10;
const BATTLE_CRIT_MULTIPLIER = 1.7;
const BATTLE_MAX_ROUNDS = 20;
const AUTO_SPEEDS = [1, 2, 3] as const;
type AutoSpeed = (typeof AUTO_SPEEDS)[number];
const BOT_TURN_DELAY_MS = 300;
const AUTO_PLAYER_TURN_DELAY_MS = 260;
// Сокращаем длительность фуллскрин-VFX с 520 → 320 мс (Phase 1 редизайна боя):
// при 6 живых бойцах × 6-12 раундов это убирает ~70% «сумбурных» вспышек.
const BATTLE_VFX_DURATION_MS = 320;
// Длительность анимации damage popup (см. keyframes battleDmgFloat внутри JSX боя).
// Оставляем небольшой запас (840 мс) поверх 760 мс анимации, чтобы успеть отрендерить.
const BATTLE_DMG_POPUP_LIFETIME_MS = 840;
// Локальный «удар» по цели (shake) и tracer attacker→target.
const BATTLE_TRACER_DURATION_MS = 280;
// Phase 2: arena shake на KO + финишер-баннер.
const BATTLE_KO_SHAKE_MS = 380;
const BATTLE_FINISHER_DELAY_MS = 1100;

function normalizeCardSquadIdsForCollection(ids: string[], collection: Record<string, number>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const id of ids) {
    if (normalized.length >= 3) break;
    if (seen.has(id)) continue;
    if ((collection[id] ?? 0) <= 0) continue;
    if (!CHARACTER_CARDS.some(card => card.id === id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

type BattleRewardModal = {
  result: 'win' | 'lose';
  title: string;
  subtitle: string;
  rewards: string[];
  stars?: number;
  ratingDelta?: number;
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
    /** ms: якорь тиков восстановления (сервер + клиент) */
    energyRegenAt?: number;
  };
  pve: {
    currentChapter: number;
    currentLevel: number;
  };
  cards: {
    collection: Record<string, number>;
    /** Звёзды карт (1..5). Для прокачки сжигаем 5 копий, +10% HP/power за звезду. */
    stars?: Record<string, number>;
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
    streak?: number;
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
  { id: 1,  name: "Огненный Овен", zodiac: "Овен", emoji: "♈", image: getZodiacAvatarUrl("Овен"), rarity: "Legendary", basePower: 95, level: 1, exp: 0, statPoints: 0, stars: 1, owned: true },
  { id: 2,  name: "Земной Телец", zodiac: "Телец", emoji: "♉", image: getZodiacAvatarUrl("Телец"), rarity: "Epic", basePower: 78, level: 1, exp: 0, statPoints: 0, stars: 1, owned: true },
  { id: 3,  name: "Ветреные Близнецы", zodiac: "Близнецы", emoji: "♊", image: getZodiacAvatarUrl("Близнецы"), rarity: "Rare", basePower: 52, level: 1, exp: 0, statPoints: 0, stars: 1, owned: true },
  { id: 4,  name: "Лунный Рак", zodiac: "Рак", emoji: "♋", image: getZodiacAvatarUrl("Рак"), rarity: "Rare", basePower: 49, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 5,  name: "Солнечный Лев", zodiac: "Лев", emoji: "♌", image: getZodiacAvatarUrl("Лев"), rarity: "Epic", basePower: 88, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 6,  name: "Кристаллическая Дева", zodiac: "Дева", emoji: "♍", image: getZodiacAvatarUrl("Дева"), rarity: "Legendary", basePower: 102, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 7,  name: "Звёздные Весы", zodiac: "Весы", emoji: "♎", image: getZodiacAvatarUrl("Весы"), rarity: "Epic", basePower: 65, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 8,  name: "Тёмный Скорпион", zodiac: "Скорпион", emoji: "♏", image: getZodiacAvatarUrl("Скорпион"), rarity: "Rare", basePower: 72, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 9,  name: "Громовой Стрелец", zodiac: "Стрелец", emoji: "♐", image: getZodiacAvatarUrl("Стрелец"), rarity: "Epic", basePower: 81, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 10, name: "Горный Козерог", zodiac: "Козерог", emoji: "♑", image: getZodiacAvatarUrl("Козерог"), rarity: "Legendary", basePower: 97, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 11, name: "Электрический Водолей", zodiac: "Водолей", emoji: "♒", image: getZodiacAvatarUrl("Водолей"), rarity: "Rare", basePower: 59, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
  { id: 12, name: "Морские Рыбы", zodiac: "Рыбы", emoji: "♓", image: getZodiacAvatarUrl("Рыбы"), rarity: "Epic", basePower: 68, level: 1, exp: 0, statPoints: 0, stars: 1, owned: false },
];

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

type MiniGuide = {
  title: string;
  body: string;
  bullets: string[];
};

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

const PENDING_XRP_PURCHASE_KEY = 'gft.pendingXrpPurchase.v1';

interface PendingXrpPurchaseEntry {
  uuid: string;
  playerId: string;
  packId: string;
  startedAt: number;
}

function readPendingXrpPurchase(): PendingXrpPurchaseEntry | null {
  try {
    const raw = localStorage.getItem(PENDING_XRP_PURCHASE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<PendingXrpPurchaseEntry>;
    if (!j || typeof j.uuid !== 'string' || typeof j.playerId !== 'string') return null;
    if (typeof j.startedAt !== 'number' || !Number.isFinite(j.startedAt)) return null;
    return {
      uuid: j.uuid,
      playerId: j.playerId,
      packId: typeof j.packId === 'string' ? j.packId : '',
      startedAt: j.startedAt,
    };
  } catch {
    return null;
  }
}

function writePendingXrpPurchase(entry: PendingXrpPurchaseEntry): void {
  try {
    localStorage.setItem(PENDING_XRP_PURCHASE_KEY, JSON.stringify(entry));
  } catch {
    // в самом деле непринципиально — это лишь backup на случай reload
  }
}

function clearPendingXrpPurchase(): void {
  try {
    localStorage.removeItem(PENDING_XRP_PURCHASE_KEY);
  } catch {
    // ignore
  }
}

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

/**
 * Линия от центра атакующего к центру цели и пульсирующий маркер на цели.
 * Координаты берём из getBoundingClientRect; перерисовка раз на удар (см. BATTLE_TRACER_DURATION_MS).
 */
function AttackTracer({
  attack,
  arenaRef,
  refs,
}: {
  attack: NonNullable<CardBattleState['lastAttack']>;
  arenaRef: RefObject<HTMLDivElement | null>;
  refs: MutableRefObject<Map<string, HTMLElement>>;
}) {
  const [coords, setCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const fromEl = refs.current.get(attack.fromUid);
    const toEl = refs.current.get(attack.toUid);
    if (!fromEl || !toEl) return;
    const arenaRect = arena.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    setCoords({
      x1: fromRect.left + fromRect.width / 2 - arenaRect.left,
      y1: fromRect.top + fromRect.height / 2 - arenaRect.top,
      x2: toRect.left + toRect.width / 2 - arenaRect.left,
      y2: toRect.top + toRect.height / 2 - arenaRect.top,
    });
    // attack.fromUid/toUid стабильны в пределах конкретного attack.id (генерируем новый id на каждый удар),
    // поэтому пересчитывать координаты по их изменению не нужно — это бы ввело лишний рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attack.id, arenaRef, refs]);
  if (!coords) return null;
  const palette: Record<CardAbility['kind'], string> = {
    damage: '#fb923c',
    heal: '#4ade80',
    shield: '#38bdf8',
    dot: '#a855f7',
    stun: '#facc15',
  };
  const color = palette[attack.kind];
  const dx = coords.x2 - coords.x1;
  const dy = coords.y2 - coords.y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${coords.x1}px`,
          top: `${coords.y1}px`,
          width: `${length}px`,
          height: '3px',
          background: `linear-gradient(90deg, transparent 0%, ${color} 35%, ${color} 70%, transparent 100%)`,
          transform: `translate(0, -50%) rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          opacity: 0.92,
          boxShadow: `0 0 10px ${color}`,
          animation: `tracerLine ${BATTLE_TRACER_DURATION_MS}ms ease-out forwards`,
          borderRadius: '999px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${coords.x2}px`,
          top: `${coords.y2}px`,
          width: '34px',
          height: '34px',
          marginLeft: '-17px',
          marginTop: '-17px',
          borderRadius: '999px',
          border: `2px solid ${color}`,
          boxShadow: `0 0 18px ${color}`,
          animation: `tracerImpact ${BATTLE_TRACER_DURATION_MS}ms ease-out forwards`,
        }}
      />
    </div>
  );
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
  /** Метаданные дневных обновлений PvP-списка (бесплатно/платно). */
  const [pvpRefreshMeta, setPvpRefreshMeta] = useState<PvpRefreshMeta | null>(null);
  const [pvpRefreshBusy, setPvpRefreshBusy] = useState(false);
  const [referralData, setReferralData] = useState<ReferralSnapshot | null>(null);
  const [referralCodeInput, setReferralCodeInput] = useState(() => {
    // Telegram WebApp deep-link `https://t.me/<bot>?start=ref_<id>` приходит сюда
    // через initDataUnsafe.start_param ещё до того, как игрок открыл экран рефералов.
    try {
      const sp = getTelegramWebApp()?.initDataUnsafe?.start_param;
      const m = typeof sp === 'string' ? sp.match(/^ref_(\d+)$/) : null;
      return m ? m[1] : '';
    } catch {
      return '';
    }
  });
  const [pendingDeeplinkRef, setPendingDeeplinkRef] = useState<string | null>(() => {
    try {
      const sp = getTelegramWebApp()?.initDataUnsafe?.start_param;
      const m = typeof sp === 'string' ? sp.match(/^ref_(\d+)$/) : null;
      return m ? m[1] : null;
    } catch {
      return null;
    }
  });
  const [referralBusy, setReferralBusy] = useState(false);
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
  const [playerRegisterError, setPlayerRegisterError] = useState('');
  const [progressHydrated, setProgressHydrated] = useState(() => !localStorage.getItem('gft_player_id'));

  const blockIfNoPlayerId = (): boolean => {
    if (playerId) return false;
    if (!playerRegisterSettled) {
      alert('Профиль игрока ещё загружается. Подожди пару секунд и попробуй снова.');
    } else {
      alert(
        `Не удалось получить игровой ID с сервера.\n\n${playerRegisterError || 'Проверь доступ к API, CORS (FRONTEND_ORIGIN) и адрес VITE_API_BASE при сборке.'}\n\nОбнови страницу.`,
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
  const battleArenaRef = useRef<HTMLDivElement | null>(null);
  const fighterCardRefs = useRef(new Map<string, HTMLElement>());
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [miniGuideOpen, setMiniGuideOpen] = useState(false);
  const [hudMenuOpen, setHudMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const bottomNavRef = useRef<HTMLElement>(null);
  const pvpRngRef = useRef<ReturnType<typeof createPvpRng> | null>(null);
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
  /** Вертикальный зазор под угловые плашки (аватар, компактный батлпасс) — ниже шапки. */
  const homeProfileStackReserve = 'clamp(44px, 12vw, 72px)';
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
  const [teamTab, setTeamTab] = useState<'squad' | 'cards' | 'cardCraft' | 'cardExchange'>('squad');
  const [holdEndTime, setHoldEndTime] = useState<number | null>(null);
  const [holdLockedGft, setHoldLockedGft] = useState(0);
  const [holdEarnings, setHoldEarnings] = useState(0);
  const [holdRewardRate, setHoldRewardRate] = useState(HOLD_REWARD_RATE);
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdAmountInput, setHoldAmountInput] = useState('100');
  const [dailyRewardClaimedDate, setDailyRewardClaimedDate] = useState(() => localStorage.getItem('gft_daily_reward_claimed_v1') ?? '');
  const [dailyRewardStreak, setDailyRewardStreak] = useState(0);
  const [now, setNow] = useState(getTimestamp);
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const [balance, setBalance] = useState(1500); // GFT: донатная валюта
  const [crystals, setCrystals] = useState(10000); // Кристаллы: редкая игровая валюта за достижения и сложный прогресс
  const [coins, setCoins] = useState(20000); // Монеты: бесплатная валюта за обычную игру
  const [rating, setRating] = useState(1240); // Рейтинг PVP
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [energyRegenAt, setEnergyRegenAt] = useState(0);
  const maxEnergy = MAX_ENERGY;
  const energyStateRef = useRef({ e: MAX_ENERGY, at: 0 });
  useEffect(() => {
    energyStateRef.current = { e: energy, at: energyRegenAt };
  }, [energy, energyRegenAt]);

  useEffect(() => {
    if (!battleVfx) return;
    const timeout = window.setTimeout(() => setBattleVfx(null), BATTLE_VFX_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [battleVfx]);

  useEffect(() => {
    let cancelled = false;
    const zodiacs = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
    const rarities: Array<'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'> = ['Common','Rare','Epic','Legendary','Mythic'];

    /** Первый экран и нижнее меню — не блокируем вход из‑за тяжёлых аватаров и рамок. */
    const preloadImages = [
      'images/bg/home.webp',
      'images/bg/arena.webp',
      'images/bg/shop.webp',
      'images/bg/squad.webp',
    ] as const;
    preloadImages.forEach(src => {
      const img = new Image();
      img.src = publicAssetUrl(src);
    });

    const criticalUrls: string[] = [
      BG_PATHS.loading,
      BG_PATHS.heroSelect,
      BG_PATHS.home,
      '/images/ui/nav-home-bg.png',
      '/images/ui/nav-arena-bg.png',
      '/images/ui/nav-team-bg.png',
      '/images/ui/nav-shop-bg.png',
    ];
    const deferredUrls: string[] = [
      BG_PATHS.arena,
      BG_PATHS.squad,
      BG_PATHS.farm,
      BG_PATHS.progression,
      ...BACKGROUND_PREFETCH,
      ...zodiacs.map(z => getZodiacAvatarUrl(z)),
      ...rarities.map(r => getRarityFrameUrl(r)),
      ...ARTIFACT_TYPES.map(t => publicAssetUrl(`images/artifacts/art/${t}.png`)),
      ...ARTIFACT_TYPES.flatMap(t =>
        ARTIFACT_RARITIES.map(r => publicAssetUrl(`images/artifacts/art/${t}-${r.toLowerCase()}.png`)),
      ),
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

  // Если в режиме playing внезапно нет героя (восстановление по Telegram без отряда,
  // ручной сброс данных и т.п.) — переключаемся на экран создания героя.
  useEffect(() => {
    if (!progressHydrated) return;
    if (gamePhase === 'playing' && !mainHero) {
      setGamePhase('create');
    }
  }, [gamePhase, mainHero, progressHydrated]);

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

  const [xrplAccount, setXrplAccount] = useState<string | null>(null);
  const [xrpBalance, setXrpBalance] = useState<string | null>(null);
  const [nftBonuses, setNftBonuses] = useState<NftBonuses>(EMPTY_NFT_BONUSES);
  const [nftBonusBusy, setNftBonusBusy] = useState(false);
  const [xamanBusy, setXamanBusy] = useState(false);
  const tonAddress = useTonAddress(true);
  const [tonConnectUI] = useTonConnectUI();
  const [depositAmount, setDepositAmount] = useState('10');
  const [depositBusy, setDepositBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawDest, setWithdrawDest] = useState('');
  const [withdrawDestMode, setWithdrawDestMode] = useState<'bound' | 'custom'>('bound');
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState<GftWithdrawEntry[] | null>(null);
  const [withdrawHistoryBusy, setWithdrawHistoryBusy] = useState(false);
  const [shopCoinPacks, setShopCoinPacks] = useState<ShopCoinPacksResponse | null>(null);
  const [xrpCoinBusy, setXrpCoinBusy] = useState(false);
  const [tonCoinBusy, setTonCoinBusy] = useState(false);
  const tonScopedKey = playerId ? `ton_wallet:${playerId}` : '';
  const tonConnectRequestedRef = useRef(false);

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
      const streakLine =
        reward.streak != null
          ? `\n🔥 Серия: ${reward.streak} дн.${reward.streakBonusMult != null ? ` (награда ×${Number(reward.streakBonusMult).toFixed(2)})` : ''}`
          : '';
      const milestoneLine = reward.milestone
        ? `\n🏆 Веха ${reward.milestone}: бонусные осколки/GFT добавлены сверху!`
        : '';
      hapticNotification('success');
      alert(
        `🎁 Ежедневная награда (${reward.tier}) получена!\n+${reward.coins} монет\n+${reward.crystals} кристаллов\n+${reward.materials} материалов\n+${reward.shards} осколков${reward.gft > 0 ? `\n+${reward.gft} GFT` : ''}${streakLine}${milestoneLine}`,
      );
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
        const { id } = await registerPlayer(identityKey, tg?.initData);
        if (cancelled) return;
        const numericId = String(id);
        setPlayerRegisterError('');
        setProgressHydrated(false);
        setPlayerId(numericId);
        localStorage.setItem('gft_player_id', numericId);
      } catch (error) {
        if (cancelled) return;
        setPlayerRegisterError(error instanceof Error ? error.message : 'Неизвестная ошибка регистрации игрока.');
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
    if (!playerId) {
      setXrplAccount(null);
      return;
    }
    const scopedKey = `xrpl_account:${playerId}`;
    const scoped = localStorage.getItem(scopedKey);
    if (scoped) {
      setXrplAccount(scoped);
      return;
    }
    // Миграция со старого общего ключа на ключ, привязанный к playerId.
    const legacy = localStorage.getItem('xrpl_account');
    if (legacy) {
      localStorage.setItem(scopedKey, legacy);
      setXrplAccount(legacy);
      return;
    }
    setXrplAccount(null);
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    const scopedKey = `xrpl_account:${playerId}`;
    if (xrplAccount) {
      localStorage.setItem(scopedKey, xrplAccount);
      return;
    }
    localStorage.removeItem(scopedKey);
  }, [playerId, xrplAccount]);

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
      if (!link) {
        alert('Не удалось получить ссылку Xaman. Попробуй ещё раз.');
        return;
      }
      openExternalLink(link);

      const start = getTimestamp();
      while (getTimestamp() - start < 2 * 60 * 1000) {
        try {
          const p = await xamanGetPayload(signIn.uuid);
          const account = p?.response?.account ?? null;
          if (account) {
            setXrplAccount(account);
            return;
          }
          if (p?.meta?.cancelled || p?.meta?.expired) return;
        } catch (pollErr) {
          // Сетевые сбои в опросе не должны прекращать привязку — продолжаем тикать.
          console.warn('[xaman] poll error', pollErr);
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error('[xaman] connect failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Не удалось открыть Xaman: ${msg}`);
    } finally {
      setXamanBusy(false);
    }
  };

  const disconnectXaman = () => {
    setXrplAccount(null);
    setXrpBalance(null);
    setNftBonuses(EMPTY_NFT_BONUSES);
    if (playerId) {
      localStorage.removeItem(`xrpl_account:${playerId}`);
    }
    localStorage.removeItem('xrpl_account');
  };

  const openTonConnect = () => {
    try {
      tonConnectRequestedRef.current = true;
      const p = tonConnectUI.openModal();
      if (p && typeof (p as Promise<void>).then === 'function') {
        (p as Promise<void>).catch((err) => {
          console.error('[ton] openModal failed', err);
          const msg = err instanceof Error ? err.message : String(err);
          alert(`Не удалось открыть TonConnect: ${msg}`);
        });
      }
    } catch (err) {
      console.error('[ton] openModal threw', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Не удалось открыть TonConnect: ${msg}`);
    }
  };

  const disconnectTon = () => {
    tonConnectRequestedRef.current = false;
    if (tonScopedKey) {
      localStorage.removeItem(tonScopedKey);
    }
    void tonConnectUI.disconnect();
  };

  useEffect(() => {
    if (!playerId || !tonAddress) return;
    if (!tonScopedKey) return;
    const bound = localStorage.getItem(tonScopedKey);
    if (!bound) {
      if (tonConnectRequestedRef.current) {
        localStorage.setItem(tonScopedKey, tonAddress);
        tonConnectRequestedRef.current = false;
        return;
      }
      // Новый игрок без TON-привязки не должен автоматически получать сессию от предыдущего игрока.
      void tonConnectUI.disconnect();
      return;
    }
    if (bound !== tonAddress) {
      if (tonConnectRequestedRef.current) {
        localStorage.setItem(tonScopedKey, tonAddress);
        tonConnectRequestedRef.current = false;
        return;
      }
      // У этого игрока уже привязан другой TON-кошелёк: не даём "прилипнуть" чужой сессии.
      void tonConnectUI.disconnect();
      return;
    }
    tonConnectRequestedRef.current = false;
  }, [playerId, tonAddress, tonConnectUI, tonScopedKey]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await fetchShopCoinPacks();
        if (!cancelled) setShopCoinPacks(p);
      } catch {
        if (!cancelled) setShopCoinPacks(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamePhase]);

  // applySavedProgress объявляется ниже; обёртка через ref снимает forward-reference и
  // не пересоздаёт колбэки опросов при каждом ребилде applySavedProgress.
  const applySavedProgressRef = useRef<((p: SavedGameProgress) => void) | null>(null);

  /**
   * Polling Xaman/XRPL покупки до credited / invalid / cancelled / expired / timeout.
   * Возвращает true, если состояние финализировано (credited / already_credited / invalid / cancelled / expired).
   */
  const pollXrpCoinPurchase = useCallback(
    async (uuid: string, ownerPlayerId: string, deadlineAt: number): Promise<boolean> => {
      while (getTimestamp() < deadlineAt) {
        let v;
        try {
          v = await verifyXrpCoinPurchase(ownerPlayerId, uuid);
        } catch {
          // временные сетевые сбои не должны прерывать polling, попробуем ещё раз
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        if (v.status === 'credited' && isSavedGameProgress(v.progress)) {
          applySavedProgressRef.current?.(v.progress);
          alert(`🪙 +${v.coins} игровых монет (оплата XRP)`);
          return true;
        }
        if (v.status === 'already_credited') {
          alert('Этот платёж уже был зачислен ранее.');
          return true;
        }
        if (v.status === 'invalid') {
          const detail =
            v.reason === 'wrong_dest'
              ? `Адрес получателя не совпадает.\nОжидался: ${v.expectedDest ?? '—'}\nПришёл: ${v.dest ?? '—'}`
              : v.reason === 'wrong_amount'
                ? `Неверная сумма.\nОжидалось drops: ${v.expectedDrops ?? '—'}\nПришло: ${v.amount ?? '—'}`
                : v.reason === 'not_payment'
                  ? `Тип транзакции не Payment (${v.txType ?? '—'}).`
                  : v.reason ?? '';
          alert(
            `Платёж не прошёл проверку в XRPL.${detail ? `\n\n${detail}` : ''}\n\nОбратитесь в поддержку, если списание прошло.`,
          );
          return true;
        }
        if (v.status === 'cancelled' || v.status === 'expired') return true;
        // 'pending' / 'submitted' / 'not_signed' → продолжаем поллить
        await new Promise(r => setTimeout(r, 1500));
      }
      return false;
    },
    [],
  );

  /** Дозабираем XRP-покупку, открытую в прошлой сессии (Mini App перезапускается после редиректа в Xaman). */
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (!playerId) return;
    const stored = readPendingXrpPurchase();
    if (!stored || stored.playerId !== playerId) return;
    let cancelled = false;
    void (async () => {
      const deadline = stored.startedAt + 30 * 60 * 1000;
      if (getTimestamp() > deadline) {
        clearPendingXrpPurchase();
        return;
      }
      setXrpCoinBusy(true);
      try {
        const finalized = await pollXrpCoinPurchase(stored.uuid, stored.playerId, deadline);
        if (cancelled) return;
        if (finalized) clearPendingXrpPurchase();
      } finally {
        if (!cancelled) setXrpCoinBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // намеренно ловим только первый рестарт после успешного логина
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, playerId]);

  const startXrpCoinPurchase = async (packId: string) => {
    if (xrpCoinBusy) return;
    if (blockIfNoPlayerId()) return;
    setXrpCoinBusy(true);
    try {
      const sign = await createXrpCoinPurchase(playerId, packId);
      writePendingXrpPurchase({
        uuid: sign.uuid,
        playerId,
        packId,
        startedAt: getTimestamp(),
      });
      const link = sign.next?.always;
      if (link) void window.open(link, '_self', 'noopener,noreferrer');
      const finalized = await pollXrpCoinPurchase(
        sign.uuid,
        playerId,
        getTimestamp() + 3 * 60 * 1000,
      );
      if (finalized) clearPendingXrpPurchase();
      // если за 3 минуты в этой сессии не успели — оставляем pending в localStorage,
      // на следующем входе useEffect выше доведёт зачисление до конца.
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось купить монеты за XRP (проверь API и Xaman).');
    } finally {
      setXrpCoinBusy(false);
    }
  };

  const startTonShopPurchase = async (offerId: string) => {
    if (tonCoinBusy) return;
    if (blockIfNoPlayerId()) return;
    if (!tonAddress) {
      alert('Сначала нажми «Подключить TON» в шапке и выбери кошелёк.');
      return;
    }
    setTonCoinBusy(true);
    try {
      const tx = await getTonShopTransaction(playerId, offerId);
      const sent = await tonConnectUI.sendTransaction({
        validUntil: tx.validUntil,
        messages: tx.messages,
      });
      const boc = 'boc' in sent && typeof sent.boc === 'string' ? sent.boc : null;
      if (!boc) {
        alert('Кошелёк не вернул подпись транзакции.');
        return;
      }
      const v = await verifyTonShopPurchase(playerId, boc);
      if (v.status === 'credited' && isSavedGameProgress(v.progress)) {
        applySavedProgress(v.progress);
        const g = v.grant;
        if (g.type === 'coins') {
          alert(`🪙 +${g.amount} игровых монет (оплата TON)`);
        } else if (g.type === 'crystals') {
          alert(`💎 +${g.amount} кристаллов (оплата TON)`);
        } else if (g.type === 'pack') {
          alert(`🎴 Набор «${g.packName}» выдан (оплата TON)`);
        } else         if (g.type === 'battlepass') {
          alert('✅ Премиум Battle Pass открыт (оплата TON).');
        }
      } else if (v.status === 'already_credited') {
        alert('Эта TON-транзакция уже учтена.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/User rejected|rejected|cancel|denied|aborted|отмен/i.test(msg)) {
        alert(msg || 'Ошибка оплаты TON');
      }
    } finally {
      setTonCoinBusy(false);
    }
  };

  const depositGft = async () => {
    if (!xrplAccount) {
      alert('Сначала подключи кошелёк Xaman.');
      return;
    }
    if (blockIfNoPlayerId()) return;
    if (depositBusy) return;
    const value = Number(depositAmount);
    if (!Number.isFinite(value) || value <= 0) {
      alert('Введите сумму депозита.');
      return;
    }

    setDepositBusy(true);
    try {
      const dep = await gftCreateDeposit(String(value), xrplAccount, playerId);
      const link = dep.next?.always;
      if (link) window.location.href = link;

      const start = getTimestamp();
      while (getTimestamp() - start < 2 * 60 * 1000) {
        const v = await gftVerifyDeposit(dep.uuid, playerId);
        if (v.status === 'credited' || v.status === 'already_credited') {
          if (isSavedGameProgress(v.progress)) {
            applySavedProgress(v.progress);
          } else {
            earnGFT(Number(v.amount));
          }
          alert(
            v.status === 'credited'
              ? `✅ Депозит подтверждён: +${v.amount} GFT`
              : `Этот депозит уже был зачислен ранее.`,
          );
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

  const refreshWithdrawHistory = useCallback(async () => {
    if (!playerId) return;
    setWithdrawHistoryBusy(true);
    try {
      const list = await gftListWithdraws(playerId);
      setWithdrawHistory(list);
    } catch {
      setWithdrawHistory([]);
    } finally {
      setWithdrawHistoryBusy(false);
    }
  }, [playerId]);

  const openWithdraw = useCallback(() => {
    if (blockIfNoPlayerId()) return;
    setScreen('gftWallet');
  }, [blockIfNoPlayerId, setScreen]);

  const submitWithdraw = useCallback(async () => {
    if (!playerId) {
      alert('Сначала пройди регистрацию.');
      return;
    }
    if (withdrawBusy) return;
    const value = Number(withdrawAmount);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      alert('Введите целое число GFT.');
      return;
    }
    if (value < 100 || value > 1000) {
      alert('Сумма вывода должна быть от 100 до 1000 GFT.');
      return;
    }
    const dest = withdrawDestMode === 'bound' ? xrplAccount ?? '' : withdrawDest.trim();
    if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(dest)) {
      alert('Укажи корректный XRPL-адрес получателя (начинается с r…).');
      return;
    }
    if (balance < value) {
      alert(`Недостаточно GFT. Доступно: ${balance}.`);
      return;
    }

    setWithdrawBusy(true);
    try {
      const out = await gftCreateWithdraw(playerId, value, dest);
      if (isSavedGameProgress(out.progress)) {
        applySavedProgressRef.current?.(out.progress);
      } else {
        setBalance(b => Math.max(0, b - value));
      }
      setWithdrawHistory(prev => [out.withdraw, ...(prev ?? [])]);
      alert(
        `✅ Заявка #${out.withdraw.id} принята.\nСумма: ${out.withdraw.amount} GFT\nНа адрес: ${out.withdraw.destination}\n\nАдмин подпишет транзакцию вручную в течение нескольких часов. Статус видно в этом же окне.`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setWithdrawBusy(false);
    }
  }, [
    balance,
    playerId,
    withdrawAmount,
    withdrawBusy,
    withdrawDest,
    withdrawDestMode,
    xrplAccount,
  ]);

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
  /** Виджет «Друзья онлайн» на главной — последние данные с сервера. */
  const [onlineReferrals, setOnlineReferrals] = useState<OnlineReferralRow[]>([]);
  const [cardStars, setCardStars] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('gft_card_stars_v1');
      if (raw) return JSON.parse(raw) as Record<string, number>;
    } catch {
      // ignore
    }
    return {};
  });
  /** Карта, для которой открыто модальное окно прокачки (id или null). */
  const [cardUpgradeModalId, setCardUpgradeModalId] = useState<string | null>(null);
  const [cardStarUpBusy, setCardStarUpBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('gft_collection_v1', JSON.stringify(collection));
    } catch {
      // ignore
    }
  }, [collection]);

  useEffect(() => {
    try {
      localStorage.setItem('gft_card_stars_v1', JSON.stringify(cardStars));
    } catch {
      // ignore
    }
  }, [cardStars]);

  useEffect(() => {
    localStorage.setItem('gft_card_shards_v1', String(cardShards));
  }, [cardShards]);

  useEffect(() => {
    localStorage.setItem('gft_card_squad_v1', JSON.stringify(cardSquadIds));
  }, [cardSquadIds]);

  const applySavedProgress = useCallback((progress: SavedGameProgress) => {
    setUserName(progress.userName);
    setMainHero(
      progress.mainHero
        ? {
            ...progress.mainHero,
            exp: typeof progress.mainHero.exp === 'number' ? progress.mainHero.exp : 0,
            statPoints: typeof progress.mainHero.statPoints === 'number' ? progress.mainHero.statPoints : 0,
          }
        : null,
    );
    setPendingPhase(progress.mainHero ? 'playing' : 'create');
    setBalance(progress.currencies.gft);
    setCrystals(progress.currencies.crystals);
    setCoins(progress.currencies.coins);
    setRating(progress.currencies.rating);
    {
      const raw = progress.currencies.energy;
      const rawAt = progress.currencies.energyRegenAt ?? 0;
      const r = regenEnergyToNow(raw, rawAt, Date.now(), maxEnergy);
      setEnergy(r.energy);
      setEnergyRegenAt(r.energyRegenAt);
    }
    setCurrentChapter(progress.pve.currentChapter);
    setCurrentLevel(progress.pve.currentLevel);
    setCollection(progress.cards.collection);
    setCardShards(progress.cards.shards);
    setCardSquadIds(progress.cards.squadIds);
    setCardStars(progress.cards.stars && typeof progress.cards.stars === 'object' ? progress.cards.stars : {});
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
    setDailyRewardStreak(Math.max(0, Math.floor(Number(progress.dailyReward?.streak) || 0)));
  }, [
    maxEnergy,
    setEnergyRegenAt,
    setArtifacts,
    setBalance,
    setBattlePassPremium,
    setBattlePassQuestProgress,
    setCardShards,
    setCardSquadIds,
    setCardStars,
    setClaimedBattlePassRewards,
    setCoins,
    setCollection,
    setCrystals,
    setCurrentChapter,
    setCurrentLevel,
    setDailyRewardClaimedDate,
    setDailyRewardStreak,
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

  useEffect(() => {
    applySavedProgressRef.current = applySavedProgress;
  }, [applySavedProgress]);

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
        if (!cancelled) {
          void flushPendingProgressSave(playerId);
          setProgressHydrated(true);
        }
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
        energyRegenAt,
      },
      pve: {
        currentChapter,
        currentLevel,
      },
      cards: {
        collection,
        stars: cardStars,
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
        streak: dailyRewardStreak,
      },
      savedAt: new Date().toISOString(),
    };

    const timeout = window.setTimeout(() => {
      void savePlayerProgressResilient(playerId, progress).catch(() => {
        // Keep gameplay responsive if the beta API is temporarily unavailable; pending may flush on next load.
      });
    }, 1200);

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
    energyRegenAt,
    currentChapter,
    currentLevel,
    collection,
    cardShards,
    cardSquadIds,
    cardStars,
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
    dailyRewardStreak,
  ]);

  const ownedCards = useMemo(
    () => CHARACTER_CARDS.filter((card) => (collection[card.id] ?? 0) > 0),
    [collection],
  );
  const normalizedCardSquadIds = useMemo(
    () => normalizeCardSquadIdsForCollection(cardSquadIds, collection),
    [cardSquadIds, collection],
  );

  useEffect(() => {
    const changed =
      normalizedCardSquadIds.length !== cardSquadIds.length ||
      normalizedCardSquadIds.some((id, i) => id !== cardSquadIds[i]);
    if (changed) {
      setCardSquadIds(normalizedCardSquadIds);
    }
  }, [cardSquadIds, normalizedCardSquadIds]);

  const selectedCardSquad = useMemo(
    () =>
      normalizedCardSquadIds
        .map((id) => CHARACTER_CARDS.find((card) => card.id === id))
        .filter((card): card is CharacterCard => {
          if (!card) return false;
          return (collection[card.id] ?? 0) > 0;
        })
        .slice(0, 3),
    [collection, normalizedCardSquadIds],
  );
  const activeCardSquad = useMemo(
    () => (selectedCardSquad.length > 0 ? selectedCardSquad : ownedCards.slice(0, 3)),
    [ownedCards, selectedCardSquad],
  );

  const getLeaderBonus = () => {
    if (!mainHero) return { hpMultiplier: 1, powerMultiplier: 1, unlockLevel: 1 };
    // Phase 3 ребаланса: усиливаем буст Лидера от уровня (0.025/0.018 → 0.035/0.030).
    // Должно совпадать со server/pvpBattleReplay.mjs::getLeaderBonus, иначе HP/power
    // в серверном replay не сойдутся с клиентским — анти-чит будет резать честные победы.
    return {
      hpMultiplier: 1 + mainHero.level * 0.035 + mainHero.stars * 0.04,
      powerMultiplier: 1 + mainHero.level * 0.030 + mainHero.stars * 0.035,
      unlockLevel: mainHero.level,
    };
  };

  /** Звёзды карты 1..5; +10% HP/power за каждую сверх первой. Должно совпадать с server/pvpBattleReplay.mjs. */
  const getCardStars = (cardId: string) => {
    const v = Math.floor(Number(cardStars[cardId]) || 1);
    return Math.max(1, Math.min(5, v));
  };
  const getCardStarMultiplier = (stars: number) => 1 + (Math.max(1, Math.min(5, stars)) - 1) * 0.10;

  const getBuffedCardStats = (card: CharacterCard) => {
    const leader = getLeaderBonus();
    const starMult = getCardStarMultiplier(getCardStars(card.id));
    return {
      hp: Math.floor(card.hp * leader.hpMultiplier * starMult),
      power: Math.floor(card.power * leader.powerMultiplier * starMult),
    };
  };

  const toggleCardInSquad = useCallback((cardId: string) => {
    if ((collection[cardId] ?? 0) <= 0) return;
    if (normalizedCardSquadIds.includes(cardId)) {
      setCardSquadIds(prev => normalizeCardSquadIdsForCollection(prev, collection).filter(id => id !== cardId));
      return;
    }
    if (normalizedCardSquadIds.length >= 3) {
      alert('В отряде максимум 3 карты.');
      return;
    }
    setCardSquadIds(prev => [...normalizeCardSquadIdsForCollection(prev, collection), cardId]);
  }, [collection, normalizedCardSquadIds]);

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

  const upgradeCardStar = async (cardId: string) => {
    if (cardStarUpBusy) return;
    if (blockIfNoPlayerId()) return;
    const owned = collection[cardId] ?? 0;
    const stars = getCardStars(cardId);
    if (stars >= CARD_STAR_MAX) {
      alert('Эта карта уже на максимальной звезде.');
      return;
    }
    if (owned < 1 + CARD_STAR_UP_COST) {
      alert(`Нужно минимум ${1 + CARD_STAR_UP_COST} копий: 1 базовая + ${CARD_STAR_UP_COST} жертвенных. Сейчас: ${owned}.`);
      return;
    }
    setCardStarUpBusy(true);
    try {
      const result = await upgradePlayerCardStar(playerId, cardId);
      if (isSavedGameProgress(result.progress)) applySavedProgress(result.progress);
      else {
        // Фолбэк: если сервер отдал необычную форму ответа, обновляем локально, чтобы UI не залипал.
        setCollection(prev => ({ ...prev, [cardId]: Math.max(0, (prev[cardId] ?? 0) - CARD_STAR_UP_COST) }));
        setCardStars(prev => ({ ...prev, [cardId]: Math.min(CARD_STAR_MAX, (prev[cardId] ?? 1) + 1) }));
      }
      hapticNotification('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Не удалось поднять звезду: ${msg.replace(/\s+/g, ' ').trim().slice(0, 240)}`);
    } finally {
      setCardStarUpBusy(false);
    }
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

  const ownedCardsSortedForTeam = useMemo(
    () =>
      CHARACTER_CARDS
        .filter((c) => (collection[c.id] ?? 0) > 0)
        .sort((a, b) => {
          const da = CARD_RARITY_ORDER[a.rarity] ?? 0;
          const db = CARD_RARITY_ORDER[b.rarity] ?? 0;
          if (da !== db) return db - da;
          return a.name.localeCompare(b.name, 'ru');
        }),
    [collection],
  );

  const craftableCards = useMemo(() => getCraftableCards(collection), [collection]);
  const exchangePoolCards = useMemo(
    () => getRarityUpgradePool(collection, selectedExchangeRarity),
    [collection, selectedExchangeRarity],
  );
  const selectedExchangeCounts = useMemo(
    () =>
      selectedExchangeCardIds.reduce<Record<string, number>>((acc, cardId) => {
        acc[cardId] = (acc[cardId] ?? 0) + 1;
        return acc;
      }, {}),
    [selectedExchangeCardIds],
  );

  const exchangeOwnedByRarity = useMemo(() => {
    const map: Record<CardRarity, number> = {
      Common: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0,
      Mythic: 0,
    };
    (['Common', 'Rare', 'Epic', 'Legendary'] as CardRarity[]).forEach((rarity) => {
      map[rarity] = getRarityUpgradePool(collection, rarity).reduce((sum, card) => sum + (collection[card.id] ?? 0), 0);
    });
    return map;
  }, [collection]);

  const toCardFighter = (
    card: CharacterCard,
    side: 'player' | 'bot',
    idx: number,
    statMultiplier = 1,
    isPvp = false,
  ): CardFighter => {
    const baseStats = side === 'player' ? getBuffedCardStats(card) : { hp: Math.floor(card.hp * 0.95), power: card.power };
    const buffed = {
      hp: Math.max(1, Math.floor(baseStats.hp * statMultiplier)),
      power: Math.max(1, Math.floor(baseStats.power * statMultiplier)),
    };
    return {
      uid: isPvp ? createBattleCardUid(side, idx, card.id) : createCardUid(side, card.id, idx),
      name: card.name,
      role: `${card.element} • ${card.kind}`,
      emoji: side === 'player' ? '🟦' : '🟥',
      image: getCharacterCardImageUrl(card.id),
      rarity: card.rarity,
      element: card.element,
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
      ...(side === 'player' ? { stars: getCardStars(card.id) } : {}),
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
    opponent: {
      id: number;
      name: string;
      power: number;
      maxHP: number;
      emoji?: string;
      portrait?: string;
    },
    mode: CardBattleState['mode'] = 'pvp',
    pveContext?: CardBattleState['pveContext'],
    battleOpts?: { isTrainingPve?: boolean; pvpOpponentRating?: number; opponentPlayerId?: string },
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

    const isPvp = mode === 'pvp';
    if (isPvp && !battleOpts?.opponentPlayerId) {
      alert('Нет id соперника PvP — обнови страницу.');
      return;
    }

    const preCost = getBattleEnergyCost(mode, sessionPveContext ?? null);
    const pre = regenEnergyToNow(energy, energyRegenAt, Date.now(), maxEnergy);
    if (pre.energy < preCost) {
      alert(`Недостаточно энергии. Нужно ${preCost}⚡, сейчас ${pre.energy}.`);
      return;
    }

    let sessionId: string;
    let rngSeed: string | undefined;
    try {
      const { session, energy: en } = await startPlayerBattleSession(playerId, {
        mode,
        opponent: { id: opponent.id, name: opponent.name },
        pveContext: sessionPveContext,
        ...(isPvp && battleOpts?.opponentPlayerId
          ? { opponentPlayerId: battleOpts.opponentPlayerId }
          : {}),
      });
      sessionId = session.id;
      rngSeed = session.rngSeed;
      setEnergy(en.current);
      setEnergyRegenAt(en.regenAt);
    } catch (e) {
      const ex = e as Error & { status?: number; body?: Record<string, unknown> };
      if (ex.status === 400 && ex.body && ex.body.code === 'insufficient_energy') {
        const b = ex.body;
        if (typeof b.energy === 'number') setEnergy(b.energy);
        const cost = b.cost;
        const cur = b.energy;
        alert(
          `Недостаточно энергии. Нужно ${typeof cost === 'number' ? cost : '?'}⚡, сейчас ${typeof cur === 'number' ? cur : '?'}⚡.`,
        );
        return;
      }
      alert('Не удалось создать серверную сессию боя. Проверь backend и попробуй ещё раз.');
      return;
    }

    if (isPvp) {
      if (!rngSeed) {
        alert('Сервер не выдал rngSeed для PvP. Обнови backend и повтори.');
        return;
      }
      pvpRngRef.current = createPvpRng(rngSeed);
    } else {
      pvpRngRef.current = null;
    }

    advanceBattlePassQuest(mode === 'pve' ? 'pve_start' : 'pvp_start');
    const playerTeam = activeCardSquad.map((card, i) => toCardFighter(card, 'player', i, 1, isPvp));

    const commonTrainPool = CHARACTER_CARDS.filter(c => c.rarity === 'Common');
    const pvpOppR = battleOpts?.pvpOpponentRating;
    const botMultiplier = resolveCardBattleBotMultiplier({
      isTrainingPve,
      mode,
      playerRating: rating,
      pveContext: pveContext ?? null,
      pvpOpponentRating: pvpOppR ?? null,
    });
    const rng = pvpRngRef.current;
    const botPicks = isTrainingPve
      ? Array.from({ length: 3 }, () => randomItem(commonTrainPool.length ? commonTrainPool : CHARACTER_CARDS))
      : isPvp && rng
        ? Array.from({ length: 3 }, () => rng.randomItem(CHARACTER_CARDS))
        : Array.from({ length: 3 }, () => randomItem(CHARACTER_CARDS));
    const botTeam = botPicks.map((card, i) => toCardFighter(card, 'bot', i, botMultiplier, isPvp));
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
      // Training starts manually so the player can learn target/skill selection.
      auto: !isTrainingPve,
      autoSpeed: 1,
      damagePopups: [],
      log: [
        ...(trainingLogPrefix ? [trainingLogPrefix] : []),
        `🃏 ${mode === 'pve' ? 'PVE' : 'PVP'} бой 3×3 против ${opponent.name}`,
        `⏱ Первый ход: ${getFighterByUid(activeFighterUid, playerTeam, botTeam)?.name ?? 'неизвестно'}`,
      ],
      ...(isPvp ? { pvpMoves: [] } : {}),
      heroUltCharges: 0,
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

    const finalAlliesAlive = finishedBattle.playerTeam.filter(c => c.hp > 0).length;
    const finalRoundsTaken = Math.max(1, finishedBattle.round);
    try {
      const response = await claimPlayerBattleReward(playerId, {
        sessionId: finishedBattle.sessionId,
        mode: finishedBattle.mode,
        result,
        account: xrplAccount,
        pveContext: finishedBattle.pveContext,
        materialFind: artifactStats.materialFind,
        clientBattleStats: { roundsTaken: finalRoundsTaken, alliesAlive: finalAlliesAlive },
        ...(finishedBattle.mode === 'pvp' && finishedBattle.pvpMoves
          ? { pvpMoves: finishedBattle.pvpMoves }
          : {}),
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
    } catch (e) {
      const hint = e instanceof Error && e.message ? e.message.replace(/\s+/g, ' ').trim() : '';
      setBattleRewardModal({
        result,
        title: 'Сервер не подтвердил награду',
        subtitle: hint
          ? `Бой завершён, но экономика не изменилась: ${hint}`
          : 'Бой завершён, но экономика не изменилась. Проверь backend и попробуй снова.',
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

      const pvpNewMove =
        prev.mode === 'pvp'
          ? {
              side: attackerSide,
              ability,
              attackerUid: prev.activeFighterUid!,
              targetUid: targetUid ?? null,
              allyUid: allyTargetUid ?? null,
            }
          : null;

      const newLog = [...prev.log];
      const newPopups: CardBattleState['damagePopups'] = [...prev.damagePopups];
      const popupNow = () => Date.now() + Math.floor(Math.random() * 1000);
      let playerHaptic: 'light' | 'medium' | 'heavy' | null = null;
      let scheduleKoHaptic = false;
      // Phase 1 редизайна: фуллскрин VFX даём ТОЛЬКО на скиллы / криты / добивания.
      // Базовая атака — без оверлея, чтобы убрать ощущение «спама».
      let lastAttack: CardBattleState['lastAttack'] = null;
      let lastKo: CardBattleState['lastKo'] = null;
      let vfxRequest: { kind: CardAbility['kind']; title: string; targetName: string } | null = null;

      if (attacker.stunnedTurns > 0) {
        attacker.stunnedTurns -= 1;
        newLog.push(`💫 ${attacker.emoji} ${attacker.name} пропускает ход из-за оглушения.`);
        if (attackerSide === 'player') playerHaptic = 'light';
      } else {
        const abilityData = attacker.abilities[ability];
        if (ability === 'skill' && attacker.cooldowns.skill > 0) return prev;

        const target = targetUid ? defTeam.find(c => c.uid === targetUid && c.hp > 0) : defTeam.find(c => c.hp > 0);
        const rol =
          prev.mode === 'pvp' && pvpRngRef.current
            ? pvpRngRef.current.randomRange(0.9, 0.25)
            : randomRange(0.9, 0.25);
        const baseEffectValue = Math.max(1, Math.floor(attacker.power * abilityData.power * rol));
        const effectValue =
          abilityData.kind === 'heal' || abilityData.kind === 'shield'
            ? Math.max(1, Math.floor(baseEffectValue * BATTLE_SUPPORT_MULTIPLIER))
            : Math.max(1, Math.floor(baseEffectValue * BATTLE_DAMAGE_MULTIPLIER));

        if (abilityData.kind === 'heal') {
          const ally = allyTargetUid ? atkTeam.find(c => c.uid === allyTargetUid && c.hp > 0) : getLowestHpAlly(atkTeam);
          if (!ally) return prev;
          const before = ally.hp;
          ally.hp = Math.min(ally.maxHP, ally.hp + effectValue);
          newPopups.push({ id: popupNow(), targetUid: ally.uid, amount: ally.hp - before, kind: 'heal' });
          lastAttack = { id: popupNow(), fromUid: attacker.uid, toUid: ally.uid, kind: 'heal', side: attackerSide };
          if (ability === 'skill') vfxRequest = { kind: 'heal', title: abilityData.name, targetName: ally.name };
          newLog.push(`💚 ${attacker.name}: ${abilityData.name} восстанавливает ${ally.name} +${ally.hp - before} HP.`);
          if (attackerSide === 'player') playerHaptic = 'light';
        } else if (abilityData.kind === 'shield') {
          const ally = allyTargetUid ? atkTeam.find(c => c.uid === allyTargetUid && c.hp > 0) : getLowestHpAlly(atkTeam);
          if (!ally) return prev;
          ally.shield += effectValue;
          newPopups.push({ id: popupNow(), targetUid: ally.uid, amount: effectValue, kind: 'heal' });
          lastAttack = { id: popupNow(), fromUid: attacker.uid, toUid: ally.uid, kind: 'shield', side: attackerSide };
          if (ability === 'skill') vfxRequest = { kind: 'shield', title: abilityData.name, targetName: ally.name };
          newLog.push(`🛡️ ${attacker.name}: ${abilityData.name} даёт ${ally.name} щит ${effectValue}.`);
          if (attackerSide === 'player') playerHaptic = 'light';
        } else {
          if (!target) return prev;
          const matchupSign = getElementMatchupSign(attacker.element, target.element);
          const matchupMult = getElementMatchupMultiplier(attacker.element, target.element);
          const isCrit =
            prev.mode === 'pvp' && pvpRngRef.current
              ? pvpRngRef.current.rollCrit(BATTLE_CRIT_CHANCE)
              : Math.random() < BATTLE_CRIT_CHANCE;
          const critMult = isCrit ? BATTLE_CRIT_MULTIPLIER : 1;
          const baseDamage =
            abilityData.kind === 'dot'
              ? Math.max(1, Math.floor(effectValue * BATTLE_DOT_IMMEDIATE_MULTIPLIER))
              : effectValue;
          const damage = Math.max(1, Math.floor(baseDamage * matchupMult * critMult));
          const absorbed = applyDamageToFighter(target, damage);
          const isFatal = target.hp <= 0;
          newPopups.push({ id: popupNow(), targetUid: target.uid, amount: damage, kind: isCrit ? 'crit' : 'damage' });
          lastAttack = { id: popupNow(), fromUid: attacker.uid, toUid: target.uid, kind: abilityData.kind, side: attackerSide };
          if (isFatal) {
            // Phase 2: KO — арена-шейк + крупный «KO» popup. Сторона = жертва.
            lastKo = { id: popupNow(), uid: target.uid, side: attackerSide === 'player' ? 'bot' : 'player', name: target.name };
            if (attackerSide === 'player') scheduleKoHaptic = true;
          }
          if (attackerSide === 'player') playerHaptic = isCrit ? 'heavy' : 'medium';
          let suffix = absorbed > 0 ? `, щит поглотил ${absorbed}` : '';
          if (isCrit) suffix += ' • ✨ КРИТ +50%';
          if (matchupSign === 'strong') suffix += ' • стихия сильнее (+25%)';
          else if (matchupSign === 'weak') suffix += ' • стихия слабее (-15%)';
          if (abilityData.kind === 'dot') {
            const dotTick = Math.max(1, Math.floor(effectValue * BATTLE_DOT_TICK_MULTIPLIER * matchupMult));
            target.dotDamage = Math.max(target.dotDamage, dotTick);
            target.dotTurns = Math.max(target.dotTurns, 2);
            suffix += `, наложен периодический урон`;
          }
          if (abilityData.kind === 'stun') {
            target.stunnedTurns = Math.max(target.stunnedTurns, 1);
            suffix += `, цель оглушена`;
          }
          // Гейт фуллскрин-VFX: skill || crit || добивание.
          if (ability === 'skill' || isCrit || isFatal) {
            vfxRequest = { kind: abilityData.kind, title: abilityData.name, targetName: target.name };
          }
          newLog.push(`${attackerSide === 'player' ? '🟦' : '🟥'} ${attacker.name}: ${abilityData.name} → ${target.name}: -${damage} HP${suffix}.`);
        }

        if (ability === 'skill') attacker.cooldowns.skill = abilityData.cooldownTurns;
      }

      if (vfxRequest) {
        const req = vfxRequest;
        queueMicrotask(() => showBattleVfx({ kind: req.kind, title: req.title, attackerName: attacker.name, targetName: req.targetName, side: attackerSide }));
      }

      const newPlayerTeam = attackerSide === 'player' ? atkTeam : defTeam;
      const newBotTeam = attackerSide === 'player' ? defTeam : atkTeam;
      tickDots(newPlayerTeam, newLog);
      tickDots(newBotTeam, newLog);

      const nextHeroUltCharges =
        attackerSide === 'player' ? Math.min(4, (prev.heroUltCharges ?? 0) + 1) : (prev.heroUltCharges ?? 0);
      if (playerHaptic) queueMicrotask(() => hapticImpact(playerHaptic!));
      if (scheduleKoHaptic) queueMicrotask(() => hapticNotification('warning'));

      const pAlive = getAlive(newPlayerTeam).length;
      const bAlive = getAlive(newBotTeam).length;
      const playerTeamWithCooldowns = decCooldowns(newPlayerTeam, attacker.uid);
      const botTeamWithCooldowns = decCooldowns(newBotTeam, attacker.uid);
      const nextPvpMoves =
        pvpNewMove != null ? [...(prev.pvpMoves ?? []), pvpNewMove] : prev.pvpMoves;

      if (bAlive === 0) {
        // Phase 2: вместо мгновенного endCardBattle — ставим pendingFinish и
        // показываем slow-mo баннер ~1.1 сек (см. useEffect ниже + JSX-баннер).
        return {
          ...prev,
          playerTeam: playerTeamWithCooldowns,
          botTeam: botTeamWithCooldowns,
          turn: 'ended',
          log: newLog,
          auto: false,
          pvpMoves: nextPvpMoves,
          damagePopups: newPopups,
          lastAttack,
          lastKo,
          heroUltCharges: nextHeroUltCharges,
          pendingFinish: { result: 'win', startedAt: Date.now() },
        };
      }
      if (pAlive === 0) {
        return {
          ...prev,
          playerTeam: playerTeamWithCooldowns,
          botTeam: botTeamWithCooldowns,
          turn: 'ended',
          log: newLog,
          auto: false,
          pvpMoves: nextPvpMoves,
          damagePopups: newPopups,
          lastAttack,
          lastKo,
          heroUltCharges: nextHeroUltCharges,
          pendingFinish: { result: 'lose', startedAt: Date.now() },
        };
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
      if (nextRound > BATTLE_MAX_ROUNDS) {
        const playerHpSum = playerTeamWithCooldowns.reduce((s, c) => s + c.hp + c.shield, 0);
        const botHpSum = botTeamWithCooldowns.reduce((s, c) => s + c.hp + c.shield, 0);
        const tieResult: 'win' | 'lose' = playerHpSum > botHpSum ? 'win' : 'lose';
        newLog.push(`⏳ Лимит ${BATTLE_MAX_ROUNDS} раундов: победитель по HP (${playerHpSum} vs ${botHpSum}).`);
        return {
          ...prev,
          playerTeam: playerTeamWithCooldowns,
          botTeam: botTeamWithCooldowns,
          turn: 'ended',
          log: newLog,
          auto: false,
          pvpMoves: nextPvpMoves,
          damagePopups: newPopups,
          lastAttack,
          lastKo,
          heroUltCharges: nextHeroUltCharges,
          pendingFinish: { result: tieResult, startedAt: Date.now() },
        };
      }
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
        pvpMoves: nextPvpMoves,
        damagePopups: newPopups,
        lastAttack,
        lastKo,
        heroUltCharges: nextHeroUltCharges,
      };
    });
  };

  const applyHeroUltimate = () => {
    if (!mainHero) return;
    const pattern = getHeroUltPattern(mainHero.id);
    const heroPower = getHeroUltPower(mainHero);
    const ultTitle = getHeroUltimateTitle(pattern);
    setCardBattle(prev => {
      if (!prev || prev.turn !== 'player') return prev;
      if ((prev.heroUltCharges ?? 0) < 4) return prev;

      const playerTeam = prev.playerTeam.map(c => ({ ...c, cooldowns: { ...c.cooldowns } }));
      const botTeam = prev.botTeam.map(c => ({ ...c, cooldowns: { ...c.cooldowns } }));
      const newLog = [...prev.log];
      const newPopups: CardBattleState['damagePopups'] = [...prev.damagePopups];
      const popupNow = () => Date.now() + Math.floor(Math.random() * 1000);
      let lastAttack: CardBattleState['lastAttack'] = null;
      let lastKo: CardBattleState['lastKo'] = null;
      let vfxKind: CardAbility['kind'] = 'damage';
      let vfxTargetLabel = 'все цели';
      let ultPvpTargetUid: string | null = null;

      if (pattern === 'fire_aoe') {
        vfxKind = 'damage';
        vfxTargetLabel = 'все враги';
        for (const t of getAlive(botTeam)) {
          const dmg = Math.max(1, Math.floor(heroPower * 0.55 * BATTLE_DAMAGE_MULTIPLIER));
          applyDamageToFighter(t, dmg);
          newPopups.push({ id: popupNow(), targetUid: t.uid, amount: dmg, kind: 'damage' });
        }
        newLog.push(`✨ ${mainHero.name}: ${ultTitle} — урон по всем врагам.`);
        const firstE = getAlive(botTeam)[0];
        const atk = prev.playerTeam.find(c => c.uid === prev.activeFighterUid);
        if (firstE && atk) lastAttack = { id: popupNow(), fromUid: atk.uid, toUid: firstE.uid, kind: 'damage', side: 'player' };
      } else if (pattern === 'earth_shield') {
        vfxKind = 'shield';
        for (const a of getAlive(playerTeam)) {
          const sh = Math.max(1, Math.floor(heroPower * 0.45 * BATTLE_SUPPORT_MULTIPLIER));
          a.shield += sh;
          newPopups.push({ id: popupNow(), targetUid: a.uid, amount: sh, kind: 'heal' });
        }
        newLog.push(`✨ ${mainHero.name}: ${ultTitle} — щит всем союзникам.`);
        vfxTargetLabel = 'союзники';
      } else if (pattern === 'air_heal') {
        vfxKind = 'heal';
        for (const a of getAlive(playerTeam)) {
          const h = Math.max(1, Math.floor(heroPower * 0.32 * BATTLE_SUPPORT_MULTIPLIER));
          const before = a.hp;
          a.hp = Math.min(a.maxHP, a.hp + h);
          newPopups.push({ id: popupNow(), targetUid: a.uid, amount: a.hp - before, kind: 'heal' });
        }
        newLog.push(`✨ ${mainHero.name}: ${ultTitle} — лечение всем союзникам.`);
        vfxTargetLabel = 'союзники';
      } else {
        vfxKind = 'dot';
        const target = prev.selectedTargetUid
          ? botTeam.find(c => c.uid === prev.selectedTargetUid && c.hp > 0)
          : getAlive(botTeam)[0];
        if (!target) return prev;
        const dmg = Math.max(1, Math.floor(heroPower * 1.05 * BATTLE_DAMAGE_MULTIPLIER));
        applyDamageToFighter(target, dmg);
        const dotTick = Math.max(1, Math.floor(heroPower * 0.42 * BATTLE_DOT_TICK_MULTIPLIER));
        target.dotDamage = Math.max(target.dotDamage, dotTick);
        target.dotTurns = Math.max(target.dotTurns, 3);
        newPopups.push({ id: popupNow(), targetUid: target.uid, amount: dmg, kind: 'damage' });
        const isFatal = target.hp <= 0;
        if (isFatal) {
          lastKo = { id: popupNow(), uid: target.uid, side: 'bot', name: target.name };
        }
        newLog.push(`✨ ${mainHero.name}: ${ultTitle} → ${target.name}: -${dmg} HP + DoT.`);
        const atk = prev.playerTeam.find(c => c.uid === prev.activeFighterUid);
        if (atk) lastAttack = { id: popupNow(), fromUid: atk.uid, toUid: target.uid, kind: 'dot', side: 'player' };
        if (isFatal) queueMicrotask(() => hapticNotification('warning'));
        vfxTargetLabel = target.name;
        ultPvpTargetUid = target.uid;
      }

      queueMicrotask(() => {
        hapticImpact('heavy');
        showBattleVfx({
          kind: vfxKind,
          title: ultTitle,
          attackerName: mainHero.name,
          targetName: vfxTargetLabel,
          side: 'player',
        });
      });

      tickDots(playerTeam, newLog);
      tickDots(botTeam, newLog);

      const pvpUlt =
        prev.mode === 'pvp'
          ? {
              side: 'player' as const,
              ability: 'heroUlt' as const,
              attackerUid: prev.activeFighterUid!,
              targetUid: pattern === 'water_burst' ? ultPvpTargetUid : null,
              allyUid: null,
            }
          : null;
      const nextPvpMoves = pvpUlt != null ? [...(prev.pvpMoves ?? []), pvpUlt] : prev.pvpMoves;

      const pAlive = getAlive(playerTeam).length;
      const bAlive = getAlive(botTeam).length;

      if (bAlive === 0) {
        return {
          ...prev,
          playerTeam,
          botTeam,
          turn: 'ended',
          log: newLog,
          auto: false,
          pvpMoves: nextPvpMoves,
          damagePopups: newPopups,
          lastAttack,
          lastKo,
          heroUltCharges: 0,
          pendingFinish: { result: 'win', startedAt: Date.now() },
        };
      }
      if (pAlive === 0) {
        return {
          ...prev,
          playerTeam,
          botTeam,
          turn: 'ended',
          log: newLog,
          auto: false,
          pvpMoves: nextPvpMoves,
          damagePopups: newPopups,
          lastAttack,
          lastKo,
          heroUltCharges: 0,
          pendingFinish: { result: 'lose', startedAt: Date.now() },
        };
      }

      return {
        ...prev,
        playerTeam,
        botTeam,
        log: newLog,
        pvpMoves: nextPvpMoves,
        damagePopups: newPopups,
        lastAttack,
        lastKo,
        heroUltCharges: 0,
      };
    });
  };

  // Cleanup damage popups after the floating animation finishes.
  useEffect(() => {
    if (!cardBattle || cardBattle.damagePopups.length === 0) return;
    const ids = cardBattle.damagePopups.map(p => p.id);
    const t = setTimeout(() => {
      setCardBattle(prev => {
        if (!prev) return prev;
        if (prev.damagePopups.length === 0) return prev;
        const filtered = prev.damagePopups.filter(p => !ids.includes(p.id));
        if (filtered.length === prev.damagePopups.length) return prev;
        return { ...prev, damagePopups: filtered };
      });
    }, BATTLE_DMG_POPUP_LIFETIME_MS);
    return () => clearTimeout(t);
    // Таймер привязан к снимку id popup'ов, а не ко всему cardBattle — иначе сброс на каждом тике боя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle?.damagePopups]);

  // Cleanup tracer (lastAttack) после короткой анимации удара.
  // Завязываемся ТОЛЬКО на id удара, чтобы перезапускать таймер на каждый новый удар,
  // а не при любых других изменениях lastAttack (которое мы и так очищаем сами).
  useEffect(() => {
    if (!cardBattle?.lastAttack) return;
    const id = cardBattle.lastAttack.id;
    const t = setTimeout(() => {
      setCardBattle(prev => {
        if (!prev) return prev;
        if (!prev.lastAttack || prev.lastAttack.id !== id) return prev;
        return { ...prev, lastAttack: null };
      });
    }, BATTLE_TRACER_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle?.lastAttack?.id]);

  // Phase 2: arena shake через WAAPI и cleanup lastKo.
  // CSS-анимация на root'е плохо рестартует между двумя KO подряд (имя keyframe то же,
  // браузер не запускает заново). WAAPI всегда отыгрывает с нуля, и не «наследит»
  // на следующий рендер.
  useEffect(() => {
    if (!cardBattle?.lastKo) return;
    const id = cardBattle.lastKo.id;
    const arena = battleArenaRef.current;
    const anim = arena
      ? arena.animate(
          [
            { transform: 'translate(0, 0)' },
            { transform: 'translate(-3px, 2px)' },
            { transform: 'translate(4px, -2px)' },
            { transform: 'translate(-2px, 3px)' },
            { transform: 'translate(3px, -1px)' },
            { transform: 'translate(0, 0)' },
          ],
          { duration: BATTLE_KO_SHAKE_MS, easing: 'ease-out' },
        )
      : null;
    const t = setTimeout(() => {
      setCardBattle(prev => {
        if (!prev) return prev;
        if (!prev.lastKo || prev.lastKo.id !== id) return prev;
        return { ...prev, lastKo: null };
      });
    }, BATTLE_KO_SHAKE_MS);
    return () => {
      clearTimeout(t);
      if (anim) anim.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle?.lastKo?.id]);

  // Phase 2: после pendingFinish — задержка на slow-mo баннер, потом endCardBattle.
  useEffect(() => {
    if (!cardBattle?.pendingFinish) return;
    const result = cardBattle.pendingFinish.result;
    queueMicrotask(() => {
      if (result === 'win') hapticNotification('success');
      else hapticNotification('error');
    });
    const t = setTimeout(() => {
      endCardBattle(result);
    }, BATTLE_FINISHER_DELAY_MS);
    return () => clearTimeout(t);
    // endCardBattle берётся из замыкания и стабилен достаточно для жизни компонента;
    // зависимость только на конкретный pendingFinish.startedAt — иначе перезапуск таймера
    // при каждом обновлении cardBattle ломает «слоумо».
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle?.pendingFinish?.startedAt]);

  // Автобой игрока + ход бота
  useEffect(() => {
    if (!cardBattle) return;
    if (cardBattle.turn === 'ended') return;

    const speed = cardBattle.autoSpeed > 0 ? cardBattle.autoSpeed : 1;
    if (cardBattle.turn === 'bot') {
      const t = setTimeout(() => {
        const botAttacker = cardBattle.botTeam.find(c => c.uid === cardBattle.activeFighterUid && c.hp > 0);
        const target = cardBattle.playerTeam.filter(c => c.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        const ally = cardBattle.botTeam.filter(c => c.hp > 0).sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];
        if (!botAttacker || !target) return;
        const ability: CardAbilityKey =
          cardBattle.mode === 'pvp' && pvpRngRef.current
            ? pvpRngRef.current.rollBotAbility(botAttacker.cooldowns.skill === 0)
            : rollBotAbility(botAttacker.cooldowns.skill === 0);
        applyCardAction(ability, 'bot', target.uid, ally?.uid ?? botAttacker.uid);
      }, Math.max(60, Math.floor(BOT_TURN_DELAY_MS / speed)));
      return () => clearTimeout(t);
    }

    if (cardBattle.turn === 'player' && cardBattle.auto) {
      const t = setTimeout(() => {
        const attacker = cardBattle.playerTeam.find(c => c.uid === cardBattle.activeFighterUid && c.hp > 0);
        const target = cardBattle.botTeam.filter(c => c.hp > 0).sort((a, b) => a.hp - b.hp)[0];
        if (!attacker || !target) return;
        const ability: CardAbilityKey = attacker.cooldowns.skill === 0 ? 'skill' : 'basic';
        applyCardAction(ability, 'player', target.uid, cardBattle.selectedAllyUid);
      }, Math.max(60, Math.floor(AUTO_PLAYER_TURN_DELAY_MS / speed)));
      return () => clearTimeout(t);
    }
  // Timed bot/auto turns should be driven by battle state changes, not by callback identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardBattle]);

  const selectMainHero = (hero: SquadHero) => {
    const newHero = { ...hero, exp: 0, statPoints: 0, stars: 1, level: 1 };
    setMainHero(newHero);
    setCardSquadIds(prev => (prev.length > 0 ? prev : CHARACTER_CARDS.slice(0, 3).map(card => card.id)));
    setGamePhase('playing');

    // Критично для Telegram Mini App: сохраняем выбор героя сразу,
    // чтобы профиль не терялся при быстром закрытии приложения.
    if (playerId && progressHydrated) {
      const immediateProgress: SavedGameProgress = {
        version: 1,
        userName,
        mainHero: newHero,
        currencies: {
          gft: balance,
          crystals,
          coins,
          rating,
          energy,
          energyRegenAt,
        },
        pve: {
          currentChapter,
          currentLevel,
        },
        cards: {
          collection,
          stars: cardStars,
          shards: cardShards,
          squadIds: cardSquadIds.length > 0 ? cardSquadIds : CHARACTER_CARDS.slice(0, 3).map(card => card.id),
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
          streak: dailyRewardStreak,
        },
        savedAt: new Date().toISOString(),
      };
      void savePlayerProgressResilient(playerId, immediateProgress).catch(() => {
        // Ignore transient failures: resilient saver keeps pending payload locally.
      });
    }
  };

  const getBackground = () => {
    const map: Record<Screen, string> = {
      home: BG_PATHS.home,
      arena: BG_PATHS.arena,
      team: BG_PATHS.squad,
      farm: BG_PATHS.farm,
      shop: BG_PATHS.shop,
      shopXrp: BG_PATHS.shop,
      shopTon: BG_PATHS.shop,
      levelup: BG_PATHS.progression,
      artifacts: BG_PATHS.home,
      craft: BG_PATHS.progression,
      battlepass: BG_PATHS.progression,
      referrals: BG_PATHS.home,
      gftWallet: BG_PATHS.shop,
      economyDashboard: BG_PATHS.shop,
      adminLogin: BG_PATHS.shop,
      adminDashboard: BG_PATHS.shop,
    };
    return map[screen] || BG_PATHS.home;
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

  // Восстановление энергии: 1 ед. / 5 мин (как на сервере), тик UI ~15 с
  useEffect(() => {
    if (!progressHydrated) return;
    const id = window.setInterval(() => {
      const { e, at } = energyStateRef.current;
      const r = regenEnergyToNow(e, at, Date.now(), maxEnergy);
      if (r.energy !== e || r.energyRegenAt !== at) {
        setEnergy(r.energy);
        setEnergyRegenAt(r.energyRegenAt);
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [progressHydrated, maxEnergy]);

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
        const data = await fetchPvpOpponents(playerId, { vary: pvpListRefreshKey, limit: 5 });
        if (cancelled) return;
        setPvpOpponents(data.opponents);
        setPvpRefreshMeta(data.refresh ?? null);
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

  /**
   * Платный/бесплатный refresh PvP-списка. Если следующее обновление платное,
   * запрашивает у игрока подтверждение по цене; при OK — списывает кристаллы
   * через /arena/pvp-refresh и обновляет список.
   */
  const refreshPvpOpponents = async () => {
    if (!playerId || pvpRefreshBusy || pvpOpponentsLoading) return;
    const cost = pvpRefreshMeta?.nextCost ?? 0;
    if (cost > 0) {
      const ok = window.confirm(
        `Бесплатные обновления на сегодня закончились.\nСледующее обновление стоит ${cost} кристаллов.\n\nПродолжить?`,
      );
      if (!ok) return;
    }
    setPvpRefreshBusy(true);
    setPvpOpponentsError(false);
    try {
      const data = await refreshPlayerPvpOpponents(playerId, { limit: 5 });
      setPvpOpponents(data.opponents);
      setPvpRefreshMeta(data.refresh);
      if (isSavedGameProgress(data.progress)) applySavedProgress(data.progress);
      // Меняем ключ, чтобы повторный заход с тем же effect-ом не дёрнул GET поверх.
      setPvpListRefreshKey(k => k + 1);
      hapticImpact('light');
    } catch (e) {
      const ex = e as Error & { status?: number; body?: { code?: string; cost?: number; crystals?: number } };
      if (ex.status === 400 && ex.body?.code === 'insufficient_crystals') {
        alert(`Недостаточно кристаллов. Нужно ${ex.body.cost ?? '?'}, есть ${ex.body.crystals ?? '?'}.`);
      } else {
        alert(`Не удалось обновить список PvP: ${ex.message?.slice(0, 200) || ex}`);
      }
    } finally {
      setPvpRefreshBusy(false);
    }
  };

  useEffect(() => {
    if (gamePhase !== 'playing' || screen !== 'referrals' || !playerId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPlayerReferrals(playerId);
        if (!cancelled) setReferralData(data);
      } catch {
        if (!cancelled) setReferralData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamePhase, screen, playerId]);

  // Виджет «Друзья онлайн» на главной — обновляем при заходе на Home и каждые 60 с.
  useEffect(() => {
    if (gamePhase !== 'playing' || screen !== 'home' || !playerId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await fetchOnlineReferrals(playerId);
        if (!cancelled) setOnlineReferrals(data.items);
      } catch {
        if (!cancelled) setOnlineReferrals([]);
      }
    };
    void tick();
    const t = window.setInterval(() => void tick(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [gamePhase, screen, playerId]);

  const bindReferralCode = async () => {
    const code = referralCodeInput.trim();
    if (!code) {
      alert('Введи реферальный код игрока.');
      return;
    }
    if (blockIfNoPlayerId()) return;
    if (referralBusy) return;
    setReferralBusy(true);
    try {
      const out = await bindPlayerReferralCode(playerId, code);
      if (isSavedGameProgress(out.progress)) applySavedProgress(out.progress);
      setReferralData(out.referral);
      setReferralCodeInput('');
      setPendingDeeplinkRef(null);
      if (out.reward) {
        alert(`✅ Код привязан. Бонус: +${out.reward.coins} монет и +${out.reward.crystals} кристаллов.`);
      } else {
        alert('✅ Код уже был привязан ранее.');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setReferralBusy(false);
    }
  };

  const claimReferralTierReward = async (invites: number) => {
    if (blockIfNoPlayerId()) return;
    if (referralBusy) return;
    setReferralBusy(true);
    try {
      const out = await claimPlayerReferralTier(playerId, invites);
      if (isSavedGameProgress(out.progress)) applySavedProgress(out.progress);
      setReferralData(out.referral);
      const r = out.reward;
      alert(
        `🎁 Награда получена: +${r.coins ?? 0} монет, +${r.crystals ?? 0} кристаллов${r.gft ? `, +${r.gft} GFT в реферальной копилке (забери в карточке «Комиссии»)` : ''}.`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setReferralBusy(false);
    }
  };

  const claimReferralCommissionsReward = async () => {
    if (blockIfNoPlayerId()) return;
    if (referralBusy) return;
    setReferralBusy(true);
    try {
      const out = await claimReferralCommissions(playerId);
      if (isSavedGameProgress(out.progress)) applySavedProgress(out.progress);
      setReferralData(out.referral);
      const r = out.reward;
      const parts = [];
      if (r.coins > 0) parts.push(`+${r.coins} монет`);
      if (r.crystals > 0) parts.push(`+${r.crystals} кристаллов`);
      if (r.gft > 0) parts.push(`+${r.gft} GFT`);
      alert(`💸 Комиссии получены: ${parts.join(', ') || 'нет накоплений'}.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setReferralBusy(false);
    }
  };

  // Auto-bind по Telegram deep-link сразу после регистрации/создания героя:
  // если игрок зашёл по ссылке `?start=ref_<id>`, мы заранее заполнили `referralCodeInput`,
  // но привязка возможна только когда есть playerId и герой. Все setState вынесены в async,
  // чтобы не нарушать react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!pendingDeeplinkRef) return;
    if (gamePhase !== 'playing') return;
    if (!playerId || !mainHero) return;
    if (referralBusy) return;
    const code = pendingDeeplinkRef;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      // Случаи, когда привязывать нечего (уже есть инвайтер или код = self) —
      // просто сбрасываем pending в async-обработчике.
      if (referralData?.invitedBy || String(code) === String(playerId)) {
        setPendingDeeplinkRef(null);
        return;
      }
      setReferralBusy(true);
      try {
        const out = await bindPlayerReferralCode(playerId, code);
        if (cancelled) return;
        if (isSavedGameProgress(out.progress)) applySavedProgress(out.progress);
        setReferralData(out.referral);
        setReferralCodeInput('');
        setPendingDeeplinkRef(null);
      } catch {
        if (!cancelled) setPendingDeeplinkRef(null);
      } finally {
        if (!cancelled) setReferralBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeeplinkRef, gamePhase, playerId, mainHero, referralBusy, referralData?.invitedBy]);

  void referralData;
  void bindReferralCode;
  void claimReferralTierReward;
  void claimReferralCommissionsReward;

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

  const levelUp = (type: 'power' | 'stars') => {
    if (!mainHero) return;
    if (type === 'power') {
      if ((mainHero.statPoints ?? 0) < 1) {
        alert('Нет свободных очков прокачки. Набирай опыт в боях — с каждым уровнем героя +3 очка.');
        return;
      }
      setMainHero({ ...mainHero, basePower: mainHero.basePower + 5, statPoints: mainHero.statPoints - 1 });
      alert('✅ Сила +5');
      return;
    }
    const cost = 120;
    if (crystals < cost) {
      alert(`Недостаточно кристаллов! Нужно ${cost}, есть ${crystals}`);
      return;
    }
    if (mainHero.stars >= 6) return;
    setCrystals(c => c - cost);
    setMainHero({ ...mainHero, stars: mainHero.stars + 1 });
    alert('✅ Звезда +1');
  };

  const startPveBattle = useCallback((chapter: number, level: number) => {
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
        portrait: enemy.portrait,
        power: enemy.power,
        maxHP: enemy.maxHP,
      },
      'pve',
      { chapter, level, isBoss },
    );
  }, [activeCardSquad.length, canEnterPveStage, getRequiredHeroLevelForStage, setCurrentLevel, setScreen, setTeamTab]);

  const startTrainingPveBattle = useCallback(() => {
    if (activeCardSquad.length === 0) {
      alert('Сначала выбери карты в отряд.');
      setScreen('team');
      setTeamTab('cards');
      return;
    }
    void startCardBattle(
      { id: 0, name: 'Учебный манекен', portrait: '/images/pve/training-dummy.svg', power: 14, maxHP: 200 },
      'pve',
      { chapter: 1, level: 1, isBoss: false, isTraining: true },
      { isTrainingPve: true },
    );
  }, [activeCardSquad.length, setScreen, setTeamTab]);

  const startPvpBattle = useCallback((opp: PvpOpponentInfo) => {
    void startCardBattle(
      {
        id: Number(opp.playerId) || 0,
        name: opp.name || `Игрок #${opp.playerId}`,
        portrait: getPvpOpponentAvatarUrl(opp),
        power: opp.power,
        maxHP: opp.maxHP,
      },
      'pvp',
      undefined,
      { pvpOpponentRating: opp.rating, opponentPlayerId: opp.playerId },
    );
  }, []);

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

  const bottomNavItems: { screen: Screen; label: string; tile: string; activeColor: string }[] = useMemo(
    () => [
      { screen: 'home', label: 'Главная', tile: '/images/ui/nav-home-bg.png', activeColor: '#a5b4fc' },
      { screen: 'arena', label: 'Арена', tile: '/images/ui/nav-arena-bg.png', activeColor: '#f87171' },
      { screen: 'team', label: 'Отряд', tile: '/images/ui/nav-team-bg.png', activeColor: '#34d399' },
      { screen: 'referrals', label: 'Рефы', tile: '/images/ui/nav-referrals-bg.png', activeColor: '#22d3ee' },
      { screen: 'shop', label: 'Магазин', tile: '/images/ui/nav-shop-bg.png', activeColor: '#facc15' },
    ],
    [],
  );
  const activeBottomNavScreen: Screen = (
    screen === 'shopXrp' || screen === 'shopTon' ? 'shop'
      : screen === 'gftWallet' ? 'home'
        : screen === 'economyDashboard' ? 'home'
          : screen === 'adminLogin' || screen === 'adminDashboard' ? 'home'
        : screen
  );

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

  const currentMiniGuide = useMemo<MiniGuide>(() => {
    if (cardBattle) {
      return {
        title: cardBattle.isTrainingPve ? 'Обучающий бой' : 'Карточный бой 3×3',
        body: cardBattle.isTrainingPve
          ? 'Здесь можно вручную понять механику боя: выбрать цель, союзника для лечения/щита и применить базовую атаку или навык.'
          : 'Бой идёт 3 на 3. Авто включено для скорости, но его можно выключить и управлять ходами вручную.',
        bullets: [
          'Сначала выбери врага в нижнем ряду, если ходит твоя карта.',
          'Навык сильнее базовой атаки, но у него есть перезарядка.',
          'Хил и щит требуют выбрать союзника в верхнем ряду.',
          'После боя награда подтверждается сервером.',
        ],
      };
    }

    if (screen === 'arena') {
      if (arenaSubScreen === 'pvp') {
        return {
          title: 'Арена: PvP',
          body: 'Выбирай реальных соперников рядом с твоим рейтингом и запускай быстрый бой 3×3.',
          bullets: [
            'Нажми «Обновить», чтобы получить свежий список соперников.',
            'Победы дают рейтинг, монеты, кристаллы и опыт героя.',
            'Результат PvP пересчитывается сервером по журналу ходов.',
          ],
        };
      }
      if (arenaSubScreen === 'pve') {
        return {
          title: 'Арена: PvE',
          body: 'Проходи главы галактики, получай монеты, материалы, артефакты и опыт героя.',
          bullets: [
            '«Старт обучения» запускает ручной тренировочный бой без сдвига кампании.',
            'Выбери главу, затем уровень. Босс находится на 6 уровне главы.',
            'Некоторые этапы закрыты до нужного уровня героя.',
          ],
        };
      }
      if (arenaSubScreen === 'ranking') {
        return {
          title: 'Арена: рейтинг',
          body: 'Здесь видно таблицу лидеров и награды за недельный или месячный период.',
          bullets: [
            'Переключай вкладки «За неделю» и «За месяц».',
            'Рейтинг растёт за PvP-победы.',
            'Если сервер недоступен, будет показан локальный fallback.',
          ],
        };
      }
      return {
        title: 'Арена',
        body: 'Главный боевой раздел: PvP, PvE-кампания и таблица рейтинга.',
        bullets: [
          'PvP — быстрые бои против игроков.',
          'PvE — главы, боссы и тренировочный бой.',
          'Рейтинг — место среди тестеров и будущие награды.',
        ],
      };
    }

    if (screen === 'team') {
      if (teamTab === 'cards') {
        return {
          title: 'Отряд: мои карты',
          body: 'Здесь выбираются 3 карты в боевой отряд. Покупка наборов теперь находится только в Магазине.',
          bullets: [
            'Нажми на карту, чтобы добавить или убрать её из боевого отряда.',
            'В отряде максимум 3 карты.',
            'Для создания и обмена карт используй отдельные вкладки рядом.',
          ],
        };
      }
      if (teamTab === 'cardCraft') {
        return {
          title: 'Отряд: крафт карт',
          body: 'Здесь можно потратить карточные осколки и создать карту, которой ещё нет в коллекции.',
          bullets: [
            'Осколки появляются из дубликатов карт.',
            'Цена зависит от редкости карты.',
            'Кнопка активна, когда хватает осколков.',
          ],
        };
      }
      if (teamTab === 'cardExchange') {
        return {
          title: 'Отряд: обмен карт',
          body: 'Здесь можно выбрать 5 карт одной редкости и обменять их на случайную карту редкостью выше.',
          bullets: [
            'Сначала выбери направление обмена: Common → Rare и дальше.',
            'Набери ровно 5 карт в списке ниже.',
            'Обмен забирает выбранные копии и выдаёт новую карту.',
          ],
        };
      }
      return {
        title: 'Отряд',
        body: 'Здесь видно лидера и текущие 3 карты, которые выходят в бой.',
        bullets: [
          'Уровень и звёзды героя усиливают HP и силу карт.',
          'Кнопка «Выбрать карты» ведёт к коллекции.',
          'Артефакты усиливают профиль и дают бонусы к наградам.',
        ],
      };
    }

    const guideByScreen: Record<Screen, MiniGuide> = {
      home: {
        title: 'Главная',
        body: 'Центр профиля: быстрый доступ к прокачке, фарму, ежедневной награде и прогрессу аккаунта.',
        bullets: [
          'Забирай ежедневную награду, когда кнопка активна.',
          'Следи за энергией: она нужна для боёв.',
          'Переходи в «Прокачку», чтобы потратить очки героя.',
        ],
      },
      arena: {
        title: 'Арена',
        body: 'Боевой раздел с PvP, PvE и рейтингом.',
        bullets: ['Выбери режим сверху.', 'PvE развивает героя.', 'PvP повышает рейтинг.'],
      },
      team: {
        title: 'Отряд',
        body: 'Настройка героя, карт и боевого состава.',
        bullets: ['Собери 3 карты.', 'Усиливай героя.', 'Следи за артефактами.'],
      },
      farm: {
        title: 'HOLD-фарм',
        body: 'Раздел пассивного дохода GFT и бонусов NFT-коллекций.',
        bullets: [
          'Введи сумму GFT и запусти HOLD.',
          'Доход копится по таймеру до завершения периода.',
          'NFT-коллекции могут увеличить бонусы фарма и боёв.',
        ],
      },
      shop: {
        title: 'Магазин',
        body: 'Покупка наборов, валюты и переход к оплате через XRP или TON.',
        bullets: [
          'Открывай карточные наборы за монеты, кристаллы или GFT.',
          'Переходи в XRP/TON разделы для крипто-покупок монет.',
          'Проверяй баланс после подтверждения оплаты.',
        ],
      },
      shopXrp: {
        title: 'Магазин XRP',
        body: 'Покупка монет через Xaman/XRPL.',
        bullets: [
          'Выбери пакет монет.',
          'Подпиши платёж в Xaman.',
          'После подтверждения нажми проверку покупки, если баланс не обновился сам.',
        ],
      },
      shopTon: {
        title: 'Магазин TON',
        body: 'Покупка монет через TON Connect.',
        bullets: [
          'Подключи TON-кошелёк.',
          'Выбери пакет и подтверди транзакцию.',
          'Не закрывай окно до проверки оплаты.',
        ],
      },
      levelup: {
        title: 'Прокачка',
        body: 'Здесь тратятся очки героя и кристаллы на усиление основного героя.',
        bullets: [
          'Опыт героя приходит из боёв.',
          'За новый уровень герой получает очки прокачки.',
          'Сила героя усиливает карты и открывает PvE-этапы.',
        ],
      },
      artifacts: {
        title: selectedArtifact ? 'Артефакт' : 'Артефакты',
        body: selectedArtifact
          ? 'Здесь можно экипировать, улучшить, разобрать или заблокировать выбранный артефакт.'
          : 'Инвентарь артефактов: экипировка, усиление и бонусы к наградам.',
        bullets: selectedArtifact
          ? [
              'Экипируй артефакт в подходящий слот.',
              'Улучшение стоит материалы и повышает силу.',
              'Блокировка защищает важные артефакты от разбора.',
            ]
          : [
              'Экипированные артефакты дают суммарные бонусы.',
              'Артефакты падают в PvE и из наград.',
              'Мастерская крафта доступна отдельной кнопкой.',
            ],
      },
      craft: {
        title: 'Крафт',
        body: 'Мастерская создания артефактов из материалов.',
        bullets: [
          'Выбери рецепт и проверь стоимость.',
          'Редкость и бонусы зависят от рецепта и генерации.',
          'Материалы добываются в PvE, обучении и наградах.',
        ],
      },
      battlepass: {
        title: 'Батлпасс',
        body: 'Сезонная дорожка наград за опыт батлпасса и выполнение заданий.',
        bullets: [
          'Выполняй задания, чтобы получать XP батлпасса.',
          'Забирай награды на открытых уровнях.',
          'Премиум открывает дополнительную дорожку.',
        ],
      },
      referrals: {
        title: 'Рефералы',
        body: 'Приглашай друзей и получай бонусы за их активность.',
        bullets: [
          'Поделись своим реферальным кодом.',
          'Активируй чужой код, чтобы стать чьим-то рефералом.',
          'Забирай награды по тиры, как только их откроешь.',
        ],
      },
      gftWallet: {
        title: 'GFT Wallet',
        body: 'Здесь доступны стейкинг и вывод GFT с актуальными лимитами и проверками.',
        bullets: [
          'Стейкинг блокирует GFT на 30 дней и даёт бонусы.',
          'Unstake доступен только после разблокировки таймера.',
          'Вывод учитывает KYC, cooldown и динамическую комиссию.',
        ],
      },
      economyDashboard: {
        title: 'Economy Dashboard',
        body: 'Админ-панель мониторинга эмиссии, наград, стейкинга, вывода и настроек экономики.',
        bullets: [
          'Требуется валидный x-admin-token.',
          'Изменения лимитов и комиссий применяются на сервере.',
          'Следи за suspicious аккаунтами и outflow GFT.',
        ],
      },
      adminLogin: {
        title: 'Admin Login',
        body: 'Три уровня защиты: Telegram, пароль+JWT и 2FA.',
        bullets: [
          'Открывай экран только из Telegram WebApp.',
          'После пароля требуется 6-значный код Google Authenticator.',
          'Сессия админа живёт ограниченное время.',
        ],
      },
      adminDashboard: {
        title: 'Admin Dashboard',
        body: 'Защищённый вход в панели экономики и безопасности.',
        bullets: [
          'Все admin API проходят цепочку middleware.',
          'Следи за логами входов и блокировками.',
          'Переход в economy dashboard доступен отсюда.',
        ],
      },
    };

    return guideByScreen[screen];
  }, [arenaSubScreen, cardBattle, screen, selectedArtifact, teamTab]);

  const filteredArtifacts = artifacts.filter(artifact => (
    (artifactTypeFilter === 'all' || artifact.type === artifactTypeFilter)
    && (artifactRarityFilter === 'all' || artifact.rarity === artifactRarityFilter)
  ));

  const syncFromServerProgress = useCallback((progress: unknown) => {
    if (isSavedGameProgress(progress)) applySavedProgress(progress);
  }, [applySavedProgress]);

  if (gamePhase === 'loading') {
    const pct = Math.round(loadProgress * 100);
    return (
      <Background
        background={BG_PATHS.loading}
        gradient="linear-gradient(180deg, rgba(7,10,22,0.45) 0%, rgba(7,10,22,0.78) 60%, rgba(7,10,22,0.95) 100%)"
        style={{
          color: 'white',
          fontFamily: 'inherit',
          letterSpacing: '0.01em',
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
          @keyframes battleDmgFloat {
            0% { opacity: 0; transform: translate(-50%, 0) scale(0.85); }
            15% { opacity: 1; transform: translate(-50%, -8px) scale(1.18); }
            100% { opacity: 0; transform: translate(-50%, -54px) scale(1); }
          }
          @keyframes battleCritShake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-3px); }
            40% { transform: translateX(3px); }
            60% { transform: translateX(-2px); }
            80% { transform: translateX(2px); }
          }
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
      </Background>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        maxWidth: '100%',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #020617 0%, #0c1220 45%, #030712 100%)',
        color: '#f1f5f9',
        fontFamily: 'inherit',
        letterSpacing: '0.01em',
        boxSizing: 'border-box',
      }}
    >

      <header ref={headerRef} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        zIndex: 100,
        borderBottom: '1px solid rgba(234,179,8,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        boxSizing: 'border-box',
      }}>
        <TopBar
          userName={userName}
          playerId={playerId || null}
          avatarUrl={mainHero ? getZodiacAvatarUrl(mainHero.zodiac) : null}
          onMenuClick={() => setHudMenuOpen((v) => !v)}
        />
      </header>

      {hudMenuOpen && gamePhase === 'playing' && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + clamp(52px, 10vw, 62px))',
            right: '12px',
            zIndex: 140,
            width: 'min(88vw, 260px)',
            padding: '10px',
            borderRadius: '12px',
            background: 'rgba(2,6,23,0.92)',
            border: '1px solid rgba(148,163,184,0.28)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'grid',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', color: '#93c5fd', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            XRPL: {xrplAccount ?? 'не подключен'}
          </div>
          <div style={{ fontSize: '11px', color: '#22c55e' }}>
            {xrpBalance ? `${xrpBalance} XRP` : 'XRP баланс: —'} · NFT {nftBonusBusy ? '...' : `+${Math.round(nftBonuses.holdRewardBonus * 100)}%`}
          </div>
          {xrplAccount && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                inputMode="decimal"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#0a0a0a',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <button
                type="button"
                onClick={depositGft}
                disabled={depositBusy}
                style={{ padding: '6px 8px', borderRadius: '8px', border: 'none', background: depositBusy ? '#475569' : '#eab308', color: '#0b1120', fontSize: '12px', fontWeight: 800 }}
              >
                {depositBusy ? '…' : 'Deposit'}
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setHudMenuOpen(false);
                if (xrplAccount) openWithdraw();
                else void connectXaman();
              }}
              disabled={xamanBusy}
              style={{ padding: '8px 10px', borderRadius: '8px', border: 'none', background: xrplAccount ? '#22c55e' : '#60a5fa', color: '#0b1120', fontWeight: 800, fontSize: '12px' }}
            >
              {xrplAccount ? 'Открыть кошелек' : xamanBusy ? '...' : 'Подключить Xaman'}
            </button>
            {xrplAccount && (
              <button
                type="button"
                onClick={disconnectXaman}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(15,23,42,0.92)', color: '#cbd5e1', fontWeight: 700, fontSize: '12px' }}
              >
                Отключить Xaman
              </button>
            )}
            <button
              type="button"
              onClick={tonAddress ? disconnectTon : openTonConnect}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(34,211,238,0.35)', background: 'rgba(8,47,73,0.55)', color: '#a5f3fc', fontWeight: 700, fontSize: '12px' }}
            >
              {tonAddress ? 'Отключить TON' : 'Подключить TON'}
            </button>
            <button
              type="button"
              onClick={() => {
                setHudMenuOpen(false);
                setScreen('adminLogin');
              }}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(196,181,253,0.45)', background: 'rgba(76,29,149,0.45)', color: '#ddd6fe', fontWeight: 800, fontSize: '12px' }}
            >
              Admin Panel
            </button>
          </div>
        </div>
      )}

      {gamePhase === 'playing' && !cardBattle && (
        <nav ref={bottomNavRef} style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(0deg, rgba(3,7,18,0.98) 0%, rgba(15,23,42,0.94) 100%)',
          paddingTop: '8px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(10px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(10px, env(safe-area-inset-right, 0px))',
          display: 'grid',
          gridTemplateColumns: `repeat(${bottomNavItems.length}, 1fr)`,
          gap: '8px',
          zIndex: 100,
          borderTop: '1px solid rgba(234,179,8,0.25)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.42)',
          boxSizing: 'border-box',
        }}>
          <BottomNav
            items={bottomNavItems}
            activeScreen={activeBottomNavScreen}
            onNavigate={(nextScreen) => {
              setHudMenuOpen(false);
              setScreen(nextScreen as Screen);
            }}
          />
        </nav>
      )}

      {gamePhase === 'playing' && (
        <>
          <button
            type="button"
            aria-label="Открыть минигайд по текущей вкладке"
            onClick={() => setMiniGuideOpen(true)}
            style={{
              // Плавающая FAB над нижней навигацией, чтобы не перекрывать
              // капсулу батлпасса в шапке (см. правки UI Home от 30.04.2026).
              position: 'fixed',
              bottom: `calc(${mainInsets.bottom}px + 12px)`,
              right: 'max(12px, env(safe-area-inset-right, 0px))',
              zIndex: 145,
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              border: '1px solid rgba(250, 204, 21, 0.72)',
              background: 'linear-gradient(180deg, rgba(250,204,21,0.98), rgba(245,158,11,0.95))',
              color: '#111827',
              fontSize: '20px',
              fontWeight: 950,
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 22px rgba(250,204,21,0.35)',
            }}
          >
            ?
          </button>

          {miniGuideOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="mini-guide-title"
              onClick={() => setMiniGuideOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 180,
                background: 'rgba(2,6,23,0.82)',
                display: 'grid',
                placeItems: 'center',
                padding: '20px',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: 'min(440px, 100%)',
                  borderRadius: '24px',
                  padding: '20px',
                  background: 'linear-gradient(160deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96) 55%, rgba(69,26,3,0.92))',
                  border: '1px solid rgba(250,204,21,0.55)',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.62), 0 0 42px rgba(250,204,21,0.18)',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <h3 id="mini-guide-title" style={{ ...cardTitleStyle('#facc15'), margin: 0, fontSize: 'clamp(18px, 4.4vw, 24px)' }}>
                    ? {currentMiniGuide.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMiniGuideOpen(false)}
                    aria-label="Закрыть минигайд"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      border: '1px solid rgba(148,163,184,0.35)',
                      background: 'rgba(15,23,42,0.9)',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontWeight: 950,
                      flexShrink: 0,
                    }}
                  >
                    x
                  </button>
                </div>
                <p style={{ ...mutedTextStyle, margin: '0 0 14px', fontSize: '14px' }}>
                  {currentMiniGuide.body}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {currentMiniGuide.bullets.map(item => (
                    <div
                      key={item}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '22px 1fr',
                        gap: '8px',
                        alignItems: 'start',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: 'rgba(2,6,23,0.5)',
                        border: '1px solid rgba(148,163,184,0.2)',
                        color: '#e2e8f0',
                        fontSize: '13px',
                        lineHeight: 1.35,
                      }}
                    >
                      <span style={{ color: '#facc15', fontWeight: 950 }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMiniGuideOpen(false)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(90deg, #eab308, #f97316)',
                    color: '#111827',
                    fontWeight: 950,
                    cursor: 'pointer',
                  }}
                >
                  Понятно
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {receivedArtifact && (() => {
        const { artifact, source, subtitle } = receivedArtifact;
        const color = RARITY_CONFIG[artifact.rarity].color;
        const headerLabel = source === 'pve' ? 'Дроп с боя' : 'Награда батлпасса';
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 161, background: 'rgba(2,6,23,0.9)', display: 'grid', placeItems: 'center', padding: '20px' }}>
            <div style={{ width: 'min(420px, 100%)', background: `linear-gradient(160deg, #111827, ${color}33 55%, #020617)`, border: `2px solid ${color}`, borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: `0 0 70px ${color}55` }}>
              <div style={{ ...cardTitleStyle(color), fontSize: '16px', letterSpacing: '0.16em' }}>{headerLabel}</div>
              {subtitle && <div style={{ ...metaTextStyle, marginTop: '4px' }}>{subtitle}</div>}
              <ArtifactIconForArtifact
                artifact={artifact}
                width="min(150px, 52vw)"
                style={{
                  margin: '14px auto 4px',
                  boxShadow: `0 0 28px ${color}66`,
                }}
              />
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

      {cardUpgradeModalId && (() => {
        const card = CHARACTER_CARDS.find(c => c.id === cardUpgradeModalId);
        if (!card) return null;
        const owned = collection[card.id] ?? 0;
        const stars = getCardStars(card.id);
        const sm = getCardStarMultiplier(stars);
        const smNext = getCardStarMultiplier(stars + 1);
        const atMax = stars >= CARD_STAR_MAX;
        const canUpgrade = !atMax && owned >= 1 + CARD_STAR_UP_COST;
        const close = () => setCardUpgradeModalId(null);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 165, background: 'rgba(2,6,23,0.9)', display: 'grid', placeItems: 'center', padding: '20px' }}>
            <div style={{ width: 'min(440px, 100%)', background: 'linear-gradient(160deg, #0b1220, #1e1b4b 60%, #4c1d95)', border: '2px solid #facc15', borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: '0 0 60px rgba(250,204,21,0.32)' }}>
              <div style={{ ...cardTitleStyle('#facc15'), fontSize: '16px', letterSpacing: '0.06em' }}>Прокачка карты</div>
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '14px auto 8px' }}>
                <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(card.id)} srcSet={getCharacterCardImageSrcSet(card.id)} style={{ position: 'absolute', inset: 0, width: 'clamp(126px, 38vw, 160px)', height: 'clamp(126px, 38vw, 160px)', borderRadius: '20px', objectFit: 'cover' }} alt="" />
                <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: 'clamp(126px, 38vw, 160px)', height: 'clamp(126px, 38vw, 160px)' }} alt="" />
              </div>
              <h3 style={{ ...heroNameStyle, margin: '4px 0 2px', fontSize: '20px' }}>{card.name}</h3>
              <div style={{ ...metaTextStyle, marginBottom: '10px', fontSize: '12px' }}>{card.rarity} • {card.element} • {card.kind}</div>
              <div style={{ fontSize: '20px', color: '#facc15', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '10px' }}>
                {'★'.repeat(stars)}{'☆'.repeat(CARD_STAR_MAX - stars)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', background: 'rgba(2,6,23,0.6)', border: '1px solid #334155', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Сейчас (★{stars})</div>
                  <div style={{ fontWeight: 900, color: '#22c55e', fontSize: '14px' }}>HP {Math.floor(card.hp * sm)}</div>
                  <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '14px' }}>PWR {Math.floor(card.power * sm)}</div>
                </div>
                <div style={{ color: '#94a3b8', fontWeight: 900 }}>→</div>
                <div>
                  <div style={{ fontSize: '11px', color: '#facc15' }}>{atMax ? 'Максимум' : `★${stars + 1}`}</div>
                  <div style={{ fontWeight: 900, color: '#22c55e', fontSize: '14px' }}>HP {atMax ? Math.floor(card.hp * sm) : Math.floor(card.hp * smNext)}</div>
                  <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '14px' }}>PWR {atMax ? Math.floor(card.power * sm) : Math.floor(card.power * smNext)}</div>
                </div>
              </div>
              <div style={{ ...metaTextStyle, fontSize: '12px', marginBottom: '14px' }}>
                Копий: <b style={{ color: owned >= 1 + CARD_STAR_UP_COST ? '#86efac' : '#fca5a5' }}>{owned}</b>
                {' / '}нужно <b style={{ color: '#e2e8f0' }}>{1 + CARD_STAR_UP_COST}</b>
                {' '}(1 база + {CARD_STAR_UP_COST} жертв.)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={close} style={{ padding: '12px', borderRadius: '14px', border: '1px solid #475569', background: 'transparent', color: '#e2e8f0', fontWeight: 900, cursor: 'pointer' }}>
                  Закрыть
                </button>
                <button
                  onClick={() => { void upgradeCardStar(card.id); }}
                  disabled={!canUpgrade || cardStarUpBusy}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: canUpgrade && !cardStarUpBusy ? 'linear-gradient(135deg,#facc15,#f97316)' : '#334155',
                    color: canUpgrade && !cardStarUpBusy ? '#0b1120' : '#94a3b8',
                    fontWeight: 950,
                    cursor: canUpgrade && !cardStarUpBusy ? 'pointer' : 'not-allowed',
                  }}
                >
                  {atMax ? 'Максимум' : cardStarUpBusy ? '…' : `★ Поднять (${CARD_STAR_UP_COST} копий)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {receivedCard && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(2,6,23,0.9)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: 'min(420px, 100%)', background: 'linear-gradient(160deg, #111827, #312e81 55%, #581c87)', border: '2px solid #eab308', borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: '0 0 60px rgba(234,179,8,0.32)' }}>
            <div style={{ ...cardTitleStyle('#eab308'), fontSize: '18px' }}>Получена карта</div>
            <div style={{ position: 'relative', width: '190px', height: '190px', margin: '18px auto 12px' }}>
              <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(receivedCard.id)} srcSet={getCharacterCardImageSrcSet(receivedCard.id)} style={{ position: 'absolute', inset: 0, width: 'clamp(140px, 42vw, 190px)', height: 'clamp(140px, 42vw, 190px)', borderRadius: '24px', objectFit: 'cover' }} alt="" />
              <img loading="lazy" decoding="async" src={getRarityFrameUrl(receivedCard.rarity)} style={{ position: 'absolute', inset: 0, width: 'clamp(140px, 42vw, 190px)', height: 'clamp(140px, 42vw, 190px)' }} alt="" />
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 155, background: 'rgba(2,6,23,0.9)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: 'min(440px, 100%)', background: battleRewardModal.result === 'win' ? 'linear-gradient(160deg, #052e16, #0f172a 45%, #422006)' : 'linear-gradient(160deg, #111827, #312e81 55%, #450a0a)', border: `2px solid ${battleRewardModal.result === 'win' ? '#22c55e' : '#f97316'}`, borderRadius: '24px', padding: '22px', textAlign: 'center', boxShadow: battleRewardModal.result === 'win' ? '0 0 70px rgba(34,197,94,0.28)' : '0 0 70px rgba(249,115,22,0.24)' }}>
            <div style={{ fontSize: '58px', lineHeight: 1, marginBottom: '10px' }}>{battleRewardModal.result === 'win' ? '🏆' : '🛡️'}</div>
            <h3 style={{ ...heroNameStyle, margin: '0 0 8px', color: battleRewardModal.result === 'win' ? '#86efac' : '#fdba74' }}>{battleRewardModal.title}</h3>
            {battleRewardModal.stars != null && battleRewardModal.stars > 0 && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '28px',
                      color: i <= (battleRewardModal.stars ?? 0) ? '#facc15' : '#475569',
                      textShadow: i <= (battleRewardModal.stars ?? 0) ? '0 0 12px rgba(250,204,21,0.6)' : 'none',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
            <p style={{ ...metaTextStyle, margin: '0 0 16px' }}>{battleRewardModal.subtitle}</p>
            {battleRewardModal.ratingDelta != null && battleRewardModal.ratingDelta !== 0 && (() => {
              const delta = battleRewardModal.ratingDelta;
              const positive = delta > 0;
              const accent = positive ? '#22c55e' : '#f87171';
              const arrow = positive ? '▲' : '▼';
              return (
                <div
                  aria-label={positive ? `Прирост рейтинга +${delta}` : `Падение рейтинга ${delta}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    margin: '0 0 14px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    background: positive ? 'rgba(20,83,45,0.55)' : 'rgba(127,29,29,0.55)',
                    border: `1px solid ${accent}`,
                    boxShadow: `0 0 24px ${accent}33`,
                    color: '#f8fafc',
                    fontWeight: 950,
                    fontSize: 'clamp(14px, 3.6vw, 17px)',
                  }}
                >
                  <span style={{ color: accent, fontSize: 'clamp(20px, 5vw, 24px)', lineHeight: 1 }}>{arrow}</span>
                  <span>Рейтинг</span>
                  <span style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
                    {positive ? '+' : ''}{delta}
                  </span>
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '13px' }}>→ {rating}</span>
                </div>
              );
            })()}
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
        <Background
          background={BG_PATHS.heroSelect}
          gradient="linear-gradient(180deg, rgba(7,10,22,0.55) 0%, rgba(7,10,22,0.78) 55%, rgba(7,10,22,0.92) 100%)"
          style={{
            paddingTop: `${mainInsets.top}px`,
            paddingBottom: `calc(32px + env(safe-area-inset-bottom, 0px))`,
            textAlign: 'center',
            position: 'relative',
            backgroundPosition: 'center top',
          }}
        >
          <h2 style={sectionTitleStyle()}>Создание героя</h2>
          <div
            style={{
              maxWidth: '420px',
              margin: '0 auto 16px',
              padding: '14px 16px',
              background: 'rgba(17,24,39,0.78)',
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
              <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                Привязка: Telegram ID <span style={{ color: '#94a3b8' }}>{telegramUserId}</span>
                {' ↔ '}
                <span style={{ color: '#94a3b8' }}>
                  игрок {playerId ? `#${playerId}` : '…'}
                </span>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '10px' }}>
                  Один Telegram-аккаунт — один игровой профиль на сервере.
                </span>
              </div>
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
                  border: '1px solid rgba(165,180,252,0.35)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.18)',
                  borderRadius: '16px',
                  padding: '8px',
                  cursor: userName.trim() ? 'pointer' : 'not-allowed',
                  opacity: userName.trim() ? 1 : 0.6,
                  boxSizing: 'border-box',
                }}
              >
                <img loading="lazy" decoding="async" src={hero.image} style={{ width: 'clamp(120px, 36vw, 180px)', maxWidth: '100%', height: 'auto', borderRadius: '12px', display: 'block' }} alt={hero.name} />
                <p style={{ ...cardTitleStyle('#eab308'), margin: '8px 0 2px', fontSize: 'clamp(11px, 3vw, 14px)', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{hero.name}</p>
              </div>
            ))}
          </div>
        </Background>
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
          {/* Компактный статус-блок слева сверху: рейтинг и энергия. */}
          <div
            aria-label="Текущий рейтинг и энергия"
            style={{
              position: 'fixed',
              top: `calc(${mainInsets.top}px + 10px)`,
              left: 'clamp(6px, 2.5vw, 10px)',
              zIndex: 60,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '5px 8px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: '92px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'clamp(10px, 2.7vw, 12px)', color: '#fde68a', fontWeight: 800 }}>
              <span aria-hidden>🏆</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Рейт.</span>
              <span style={{ color: '#facc15', marginLeft: 'auto' }}>{rating}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'clamp(10px, 2.7vw, 12px)', color: '#bae6fd', fontWeight: 800 }}>
              <span aria-hidden>⚡</span>
              <span style={{ color: '#94a3b8', fontWeight: 700 }}>Эн.</span>
              <span style={{ color: '#38bdf8', marginLeft: 'auto' }}>
                {energy}
                <span style={{ color: '#475569', fontWeight: 700 }}>/{maxEnergy}</span>
              </span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: `calc(${mainInsets.top}px + 10px)`,
              right: 'clamp(8px, 2.8vw, 14px)',
              zIndex: 62,
            }}
          >
            <WalletPanel
              balance={balance}
              crystals={crystals}
              coins={coins}
              walletConnected={Boolean(xrplAccount)}
              walletBusy={xamanBusy || withdrawBusy}
              onWalletClick={() => {
                if (xrplAccount) {
                  openWithdraw();
                } else {
                  void connectXaman();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setScreen('battlepass')}
            style={{
              position: 'fixed',
              top: `calc(${mainInsets.top}px + clamp(58px, 15vw, 76px))`,
              right: 'clamp(6px, 2.5vw, 10px)',
              left: 'auto',
              zIndex: 60,
              width: 'min(44vw, 132px)',
              margin: 0,
              padding: '7px 8px',
              textAlign: 'left',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(250, 204, 21, 0.4)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span style={{ ...cardTitleStyle('#facc15'), fontSize: 'clamp(9px, 2.4vw, 10px)', letterSpacing: '0.02em' }}>Батлпасс</span>
              {battlePassPremium ? (
                <span style={{ fontSize: 'clamp(8px, 2.1vw, 9px)', color: '#86efac', fontWeight: 800 }}>★</span>
              ) : (
                <span style={{ fontSize: 'clamp(8px, 2.1vw, 9px)', color: '#64748b', fontWeight: 700 }}>FREE</span>
              )}
            </div>
            <div style={{ fontSize: 'clamp(10px, 2.7vw, 12px)', fontWeight: 750, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums', marginTop: '4px' }}>
              <span style={{ color: '#facc15' }}>{currentBattlePassLevel}</span>
              <span style={{ color: '#64748b' }}>/{BATTLEPASS_TIERS.length}</span>
            </div>
            <div
              style={{
                marginTop: '6px',
                height: '4px',
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
            <div style={{ fontSize: 'clamp(8px, 2.1vw, 9px)', color: '#94a3b8', marginTop: '5px', fontVariantNumeric: 'tabular-nums' }}>
              {battlePassXp} XP
            </div>
          </button>
          <h2 style={{ ...heroNameStyle, fontSize: 'clamp(16px, 4.4vw, 24px)', margin: 'clamp(12px, 3vw, 18px) 0 2px', paddingLeft: '8px', paddingRight: '8px' }}>{mainHero.name}</h2>
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
                <div style={{ fontSize: 'clamp(26px, 7vw, 34px)', flexShrink: 0, textShadow: '0 6px 10px rgba(0,0,0,0.35)' }}>🎁</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...cardTitleStyle(dailyReward.accent), fontSize: 'clamp(11px, 3vw, 14px)' }}>Ежедневная награда • {dailyReward.tier}</div>
                  <div style={{ ...mutedTextStyle, fontSize: 'clamp(9px, 2.5vw, 11px)', marginTop: '2px', lineHeight: 1.25 }}>
                    {dailyRewardClaimedToday ? 'Сегодня уже получена' : `${dailyReward.coins} мон., ${dailyReward.crystals} крист.`}
                  </div>
                  {dailyRewardStreak > 0 && (() => {
                    const milestones = [7, 14, 30];
                    const next = milestones.find(m => m > dailyRewardStreak);
                    const hint = next ? `до ${next}-дневной вехи: ${next - dailyRewardStreak} дн.` : 'все вехи пройдены ★';
                    return (
                      <div style={{ ...mutedTextStyle, fontSize: 'clamp(8px, 2.2vw, 10px)', marginTop: '4px', color: '#f97316', fontWeight: 800 }}>
                        🔥 Серия: {dailyRewardStreak} дн. • {hint}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </button>
            {/* Виджет: ближайшие батлпасс-квесты */}
            {(() => {
              const upcoming = BATTLEPASS_QUESTS
                .filter(q => q.track !== 'paid' || battlePassPremium)
                .map(q => ({
                  q,
                  progress: Math.min(battlePassQuestProgress[q.id] ?? 0, q.target),
                }))
                .filter(({ q, progress }) => progress < q.target)
                .sort((a, b) => b.progress / b.q.target - a.progress / a.q.target)
                .slice(0, 2);
              if (upcoming.length === 0) return null;
              return (
                <button
                  type="button"
                  onClick={() => setScreen('battlepass')}
                  style={{
                    gridColumn: '1 / -1',
                    minHeight: '40px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(126,34,206,0.55), rgba(15,23,42,0.92))',
                    color: '#fff',
                    border: '1px solid #a855f7',
                    borderRadius: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 10px 24px rgba(168,85,247,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ ...cardTitleStyle('#c084fc'), fontSize: 'clamp(11px, 3vw, 14px)' }}>
                      ⚡ Батлпасс‑квесты
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>{currentBattlePassLevel}/{BATTLEPASS_TIERS.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {upcoming.map(({ q, progress }) => {
                      const pct = Math.min(100, Math.round((progress / q.target) * 100));
                      return (
                        <div key={q.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 800 }}>
                            <span style={{ color: q.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</span>
                            <span style={{ color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{progress}/{q.target} • +{q.xpPerStep} XP</span>
                          </div>
                          <div style={{ marginTop: '3px', height: '5px', borderRadius: '999px', background: 'rgba(30,41,59,0.95)', border: '1px solid #334155', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${q.accent}, #facc15)`, transition: 'width 0.25s ease-out' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })()}

            {/* Виджет: друзья онлайн */}
            {onlineReferrals.length > 0 && (() => {
              const onlineCount = onlineReferrals.filter(r => r.isOnline).length;
              const visible = onlineReferrals.slice(0, 5);
              return (
                <button
                  type="button"
                  onClick={() => setScreen('referrals')}
                  style={{
                    gridColumn: '1 / -1',
                    minHeight: '40px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(20,83,45,0.55), rgba(15,23,42,0.92))',
                    color: '#fff',
                    border: '1px solid #22c55e',
                    borderRadius: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 10px 24px rgba(34,197,94,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ ...cardTitleStyle('#86efac'), fontSize: 'clamp(11px, 3vw, 14px)' }}>
                      🟢 Друзья онлайн
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>
                      {onlineCount}/{onlineReferrals.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {visible.map(r => {
                      const heroAvatar = r.mainHeroId
                        ? getZodiacAvatarUrl(allHeroes[r.mainHeroId - 1]?.zodiac ?? 'Овен')
                        : getPvpOpponentAvatarUrl({ playerId: r.playerId, mainHeroId: r.mainHeroId ?? undefined } as PvpOpponentInfo);
                      return (
                        <div key={r.playerId} title={`${r.name} • ${r.isOnline ? 'онлайн' : `был ${r.ageSec ?? '?'}с назад`}`} style={{ position: 'relative', width: '28px', height: '28px' }}>
                          <img loading="lazy" decoding="async" src={heroAvatar} alt="" style={{ width: 'clamp(24px, 7vw, 28px)', height: 'clamp(24px, 7vw, 28px)', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${r.isOnline ? '#22c55e' : '#475569'}`, opacity: r.isOnline ? 1 : 0.6 }} />
                          <span style={{ position: 'absolute', right: '-2px', bottom: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: r.isOnline ? '#22c55e' : '#475569', border: '1.5px solid #0b1220' }} />
                        </div>
                      );
                    })}
                    {onlineReferrals.length > visible.length && (
                      <span style={{ ...mutedTextStyle, fontSize: '11px', fontWeight: 800 }}>+{onlineReferrals.length - visible.length}</span>
                    )}
                  </div>
                </button>
              );
            })()}

            {/* Виджет: таймер сезона */}
            {(() => {
              const now = new Date();
              const day = now.getUTCDay() || 7;
              const daysToWeek = 7 - day + 1;
              const endOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToWeek, 0, 0, 0));
              const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
              const fmtLeft = (target: Date) => {
                const ms = Math.max(0, target.getTime() - now.getTime());
                const days = Math.floor(ms / (24 * 3600 * 1000));
                const hours = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
                if (days >= 1) return `${days} дн ${hours} ч`;
                const mins = Math.floor((ms % (3600 * 1000)) / 60_000);
                return `${hours} ч ${mins} м`;
              };
              return (
                <button
                  type="button"
                  onClick={() => setScreen('arena')}
                  style={{
                    gridColumn: '1 / -1',
                    minHeight: '40px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(146,64,14,0.55), rgba(15,23,42,0.92))',
                    color: '#fff',
                    border: '1px solid #f59e0b',
                    borderRadius: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 10px 24px rgba(245,158,11,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ ...cardTitleStyle('#fde68a'), fontSize: 'clamp(11px, 3vw, 14px)' }}>
                      ⏳ Сезон арены
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>UTC</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 800 }}>
                    <div>
                      <div style={{ color: '#94a3b8' }}>До конца недели</div>
                      <div style={{ color: '#facc15', fontVariantNumeric: 'tabular-nums' }}>{fmtLeft(endOfWeek)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#94a3b8' }}>До конца месяца</div>
                      <div style={{ color: '#fb923c', fontVariantNumeric: 'tabular-nums' }}>{fmtLeft(endOfMonth)}</div>
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Батлпасс */}
      {gamePhase === 'playing' && screen === 'battlepass' && (
        <Suspense fallback={null}>
          <BattlePassScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            battlePassPremium={battlePassPremium}
            currentBattlePassLevel={currentBattlePassLevel}
            currentBattlePassLevelXp={currentBattlePassLevelXp}
            battlePassXp={battlePassXp}
            battlePassQuestProgress={battlePassQuestProgress}
            isRewardClaimed={isBattlePassRewardClaimed}
            onClaimReward={claimBattlePassReward}
            onBuyPremium={buyBattlePassPremium}
          />
        </Suspense>
      )}


      {/* Арена */}
      {gamePhase === 'playing' && screen === 'arena' && !cardBattle && (
        <Suspense fallback={null}>
          <ArenaScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            arenaSubScreen={arenaSubScreen}
            setArenaSubScreen={setArenaSubScreen}
            rating={rating}
            playerId={playerId}
            userName={userName}
            setPvpListRefreshKey={setPvpListRefreshKey}
            pvpOpponentsLoading={pvpOpponentsLoading}
            pvpOpponentsError={pvpOpponentsError}
            pvpOpponents={pvpOpponents}
            pvpRefreshMeta={pvpRefreshMeta}
            pvpRefreshBusy={pvpRefreshBusy}
            onPvpRefresh={refreshPvpOpponents}
            onPvpBattle={startPvpBattle}
            materials={materials}
            artifactCount={artifacts.length}
            currentChapter={currentChapter}
            currentLevel={currentLevel}
            setCurrentChapter={setCurrentChapter}
            setCurrentLevel={setCurrentLevel}
            onStartTrainingPve={startTrainingPveBattle}
            getRequiredHeroLevelForStage={getRequiredHeroLevelForStage}
            canEnterPveStage={canEnterPveStage}
            onStartPveStage={startPveBattle}
            arenaRankingPeriod={arenaRankingPeriod}
            setArenaRankingPeriod={setArenaRankingPeriod}
            arenaLeaderboardLoading={arenaLeaderboardLoading}
            arenaLeaderboardError={arenaLeaderboardError}
            arenaLeaderboardEntries={arenaLeaderboardEntries}
          />
        </Suspense>
      )}

      {/* Карточный бой 3×3 — арена-вёрстка (бот сверху, игрок снизу), оптимизировано под Telegram WebView */}
      {cardBattle && (
        <BattleScreen
          cardBattle={cardBattle}
          maxRounds={BATTLE_MAX_ROUNDS}
          autoSpeeds={AUTO_SPEEDS}
          mainInsets={mainInsets}
          mainScrollPadding={mainScrollPadding}
          finisherDelayMs={BATTLE_FINISHER_DELAY_MS}
          battleArenaRef={battleArenaRef}
          fighterCardRefs={fighterCardRefs}
          vfxNode={battleVfx ? <BattleVfxOverlay key={battleVfx.id} effect={battleVfx} /> : null}
          renderTracer={(lastAttack) => (
            <AttackTracer
              key={lastAttack.id}
              attack={lastAttack}
              arenaRef={battleArenaRef}
              refs={fighterCardRefs}
            />
          )}
          ultTitle={mainHero ? getHeroUltimateTitle(getHeroUltPattern(mainHero.id)) : 'ULT'}
          onExit={() => setCardBattle(null)}
          onSelectTarget={(uid) => {
            if (cardBattle.turn !== 'player' || cardBattle.auto) return;
            const f = cardBattle.botTeam.find((x) => x.uid === uid);
            if (!f || f.hp <= 0) return;
            setCardBattle((prev) => (prev ? { ...prev, selectedTargetUid: uid } : prev));
          }}
          onSelectAlly={(uid) => {
            if (cardBattle.turn !== 'player' || cardBattle.auto) return;
            const f = cardBattle.playerTeam.find((x) => x.uid === uid);
            if (!f || f.hp <= 0) return;
            setCardBattle((prev) => (prev ? { ...prev, selectedAllyUid: uid } : prev));
          }}
          onBasic={() => {
            hapticImpact('light');
            applyCardAction('basic', 'player', cardBattle.selectedTargetUid, cardBattle.selectedAllyUid);
          }}
          onSkill={() => {
            hapticImpact('light');
            applyCardAction('skill', 'player', cardBattle.selectedTargetUid, cardBattle.selectedAllyUid);
          }}
          onUlt={mainHero ? () => applyHeroUltimate() : undefined}
          onToggleAuto={() => setCardBattle((prev) => (prev ? { ...prev, auto: !prev.auto } : prev))}
          onSetAutoSpeed={(speed) => setCardBattle((prev) => (prev ? { ...prev, autoSpeed: speed } : prev))}
        />
      )}

      {/* Team / Отряд */}
      {gamePhase === 'playing' && screen === 'team' && (
        <div style={{ minHeight: '100vh', backgroundImage: `url('${getBackground()}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'scroll', ...mainScrollPadding, textAlign: 'center', boxSizing: 'border-box' }}>
          <h2 style={{ ...sectionTitleStyle(), fontSize: 'clamp(22px, 5vw, 32px)' }}>👥 ОТРЯД</h2>

          <div style={{ maxWidth: '420px', margin: '16px auto 0', padding: '0 16px' }}>
            <button
              type="button"
              onClick={() => setScreen('artifacts')}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(30,41,59,0.9)',
                color: '#fff',
                border: '1px solid #ec4899',
                borderRadius: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ marginBottom: '8px' }}><Icon3D id="artifacts-3d" size={40} /></div>
              <div style={cardTitleStyle('#ec4899')}>Артефакты</div>
              <div style={{ ...mutedTextStyle, fontSize: '12px', marginTop: '4px' }}>Экипировка, мастерская крафта и усиления</div>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '14px auto 18px', flexWrap: 'wrap', padding: '0 12px', maxWidth: '900px' }}>
            {([
              ['squad', 'Отряд'],
              ['cards', 'Мои карты'],
              ['cardCraft', 'Крафт карт'],
              ['cardExchange', 'Обмен'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTeamTab(tab)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '9999px',
                  border: '1px solid #334155',
                  background: teamTab === tab ? '#eab308' : '#111827',
                  color: teamTab === tab ? '#000' : '#cbd5e1',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
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
                        <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(card.id)} srcSet={getCharacterCardImageSrcSet(card.id)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }} alt="" />
                        <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} alt="" />
                      </div>
                      <div style={{ ...cardTitleStyle('#e2e8f0'), fontSize: 'clamp(11px, 3vw, 13px)', lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{card.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{card.rarity} • {card.element}</div>
                      {(() => {
                        const stars = getCardStars(card.id);
                        return (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#facc15', fontWeight: 900, letterSpacing: '0.05em' }}>
                            {'★'.repeat(stars)}{'☆'.repeat(CARD_STAR_MAX - stars)}
                          </div>
                        );
                      })()}
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
              </div>
            </>
          )}

          {teamTab === 'cards' && (
            <div style={{ padding: '0 12px', maxWidth: '980px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ ...metaTextStyle, marginBottom: '12px', fontSize: 'clamp(12px, 3.2vw, 14px)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                Карты в коллекции: <b style={{ color: '#22c55e' }}>{Object.values(collection).reduce((a, b) => a + b, 0)}</b> • Уникальных: <b style={{ color: '#eab308' }}>{Object.keys(collection).filter(k => (collection[k] ?? 0) > 0).length}</b> • Осколки: <b style={{ color: '#c084fc' }}>{cardShards}</b>
              </div>

              <VirtualizedCardCollectionList
                cards={ownedCardsSortedForTeam}
                collection={collection}
                selectedCardIds={normalizedCardSquadIds}
                onToggleCard={toggleCardInSquad}
                onOpenUpgrade={setCardUpgradeModalId}
                getCardStars={getCardStars}
                getCardStarMultiplier={getCardStarMultiplier}
              />
            </div>
          )}

          {teamTab === 'cardCraft' && (
            <div style={{ padding: '0 12px', maxWidth: '980px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ ...metaTextStyle, marginBottom: '12px', fontSize: 'clamp(12px, 3.2vw, 14px)', lineHeight: 1.45 }}>
                Осколки: <b style={{ color: '#c084fc' }}>{cardShards}</b> • Создавай карты, которых ещё нет в коллекции.
              </div>
              <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #334155', borderRadius: '16px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                <div style={{ ...cardTitleStyle('#eab308'), marginBottom: '10px' }}>Крафт новых карт</div>
                <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
                  Дубликаты из наборов превращаются в осколки. Осколками можно создать карту, которой ещё нет в коллекции.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '10px', maxHeight: 'min(62vh, 620px)', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {craftableCards.length === 0 ? (
                    <div style={{ ...mutedTextStyle, padding: '14px', background: '#0b1220', border: '1px solid #334155', borderRadius: '12px' }}>
                      Все доступные карты уже есть в коллекции.
                    </div>
                  ) : (
                    craftableCards.map(card => {
                      const cost = CARD_CRAFT_COST[card.rarity];
                      const canCraft = cardShards >= cost;
                      return (
                        <div key={card.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#0b1220', border: '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ position: 'relative', width: '56px', height: '56px', flex: '0 0 56px', opacity: 0.82 }}>
                            <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(card.id)} srcSet={getCharacterCardImageSrcSet(card.id)} style={{ position: 'absolute', inset: 0, width: 'clamp(46px, 14vw, 56px)', height: 'clamp(46px, 14vw, 56px)', borderRadius: '12px', objectFit: 'cover', opacity: canCraft ? 1 : 0.55 }} alt="" />
                            <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: 'clamp(46px, 14vw, 56px)', height: 'clamp(46px, 14vw, 56px)' }} alt="" />
                          </div>
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{card.rarity} • цена {cost} осколков</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => craftCharacterCard(card)}
                            disabled={!canCraft}
                            style={{ padding: '8px 10px', borderRadius: '10px', border: 'none', background: canCraft ? '#eab308' : '#334155', color: canCraft ? '#000' : '#94a3b8', fontWeight: 900, cursor: canCraft ? 'pointer' : 'not-allowed' }}
                          >
                            Крафт
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {teamTab === 'cardExchange' && (
            <div style={{ padding: '0 12px', maxWidth: '980px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ ...metaTextStyle, marginBottom: '12px', fontSize: 'clamp(12px, 3.2vw, 14px)', lineHeight: 1.45 }}>
                Обменивай 5 карт одной редкости на 1 случайную карту редкостью выше.
              </div>
              <div style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid #7c3aed', borderRadius: '16px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                <div style={{ ...cardTitleStyle('#c084fc'), marginBottom: '10px' }}>Обмен редкости</div>
                <div style={{ ...mutedTextStyle, fontSize: '12px', marginBottom: '10px' }}>
                  Выбери конкретные 5 карт одной редкости и обменяй их на 1 случайную карту редкостью выше.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 132px), 1fr))', gap: '10px' }}>
                  {(['Common', 'Rare', 'Epic', 'Legendary'] as CardRarity[]).map(rarity => {
                    const ownedCount = exchangeOwnedByRarity[rarity] ?? 0;
                    const targetRarity = CARD_RARITY_UPGRADE_TARGET[rarity];
                    const active = selectedExchangeRarity === rarity;
                    return (
                      <button
                        key={rarity}
                        type="button"
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '10px', marginTop: '10px', maxHeight: 'min(48vh, 460px)', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {exchangePoolCards.length === 0 ? (
                    <div style={{ ...mutedTextStyle, padding: '14px', background: '#0b1220', border: '1px solid #334155', borderRadius: '12px' }}>
                      Нет карт выбранной редкости для обмена.
                    </div>
                  ) : (
                    exchangePoolCards.map(card => {
                      const ownedCount = collection[card.id] ?? 0;
                      const selectedCount = selectedExchangeCounts[card.id] ?? 0;
                      return (
                        <div key={card.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: selectedCount > 0 ? 'rgba(124,58,237,0.22)' : '#0b1220', border: selectedCount > 0 ? '1px solid #a855f7' : '1px solid #334155', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ position: 'relative', width: '54px', height: '54px', flex: '0 0 54px' }}>
                            <img loading="lazy" decoding="async" src={getCharacterCardImageUrl(card.id)} srcSet={getCharacterCardImageSrcSet(card.id)} style={{ position: 'absolute', inset: 0, width: 'clamp(44px, 13vw, 54px)', height: 'clamp(44px, 13vw, 54px)', borderRadius: '12px', objectFit: 'cover' }} alt="" />
                            <img loading="lazy" decoding="async" src={getRarityFrameUrl(card.rarity)} style={{ position: 'absolute', inset: 0, width: 'clamp(44px, 13vw, 54px)', height: 'clamp(44px, 13vw, 54px)' }} alt="" />
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleExchangeCard(card)}
                            style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 0 }}
                          >
                            <div style={{ fontWeight: 900, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Есть x{ownedCount} • выбрано x{selectedCount}</div>
                          </button>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button" onClick={() => removeExchangeCopy(card.id)} disabled={selectedCount <= 0} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: selectedCount > 0 ? '#ef4444' : '#334155', color: '#fff', fontWeight: 900, cursor: selectedCount > 0 ? 'pointer' : 'not-allowed' }}>-</button>
                            <button type="button" onClick={() => addExchangeCopy(card)} disabled={selectedExchangeCardIds.length >= CARD_RARITY_UPGRADE_COST || selectedCount >= ownedCount} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: selectedExchangeCardIds.length < CARD_RARITY_UPGRADE_COST && selectedCount < ownedCount ? '#22c55e' : '#334155', color: '#fff', fontWeight: 900, cursor: selectedExchangeCardIds.length < CARD_RARITY_UPGRADE_COST && selectedCount < ownedCount ? 'pointer' : 'not-allowed' }}>+</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={upgradeSelectedCardsByRarity}
                  disabled={selectedExchangeCardIds.length !== CARD_RARITY_UPGRADE_COST}
                  style={{ marginTop: '12px', width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? '#eab308' : '#334155', color: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? '#000' : '#94a3b8', fontWeight: 950, cursor: selectedExchangeCardIds.length === CARD_RARITY_UPGRADE_COST ? 'pointer' : 'not-allowed' }}
                >
                  Обменять выбранные карты
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {gamePhase === 'playing' && screen === 'referrals' && (
        <Suspense fallback={null}>
          <ReferralsScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            bottomInsetPx={mainInsets.bottom}
            referralData={referralData}
            playerId={playerId}
            shareBotUsername={import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? null}
            referralCodeInput={referralCodeInput}
            setReferralCodeInput={setReferralCodeInput}
            referralBusy={referralBusy}
            onBindReferralCode={bindReferralCode}
            onClaimTierReward={claimReferralTierReward}
            onClaimCommissions={claimReferralCommissionsReward}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'farm' && (
        <Suspense fallback={null}>
          <FarmScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            holdBaseRewardRate={HOLD_REWARD_RATE}
            balance={balance}
            nftBonuses={nftBonuses}
            holdEndTime={holdEndTime}
            now={now}
            holdAmountInput={holdAmountInput}
            setHoldAmountInput={setHoldAmountInput}
            holdBusy={holdBusy}
            onStartHold={startHold}
            holdLockedGft={holdLockedGft}
            holdEarnings={holdEarnings}
            holdRewardRate={holdRewardRate}
          />
        </Suspense>
      )}

      {/* Прокачка героя */}
      {gamePhase === 'playing' && screen === 'levelup' && mainHero && (
        <Suspense fallback={null}>
          <LevelUpScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            mainHero={mainHero}
            onLevelUp={levelUp}
            coins={coins}
            crystals={crystals}
            cardSquadIds={normalizedCardSquadIds}
            collection={collection}
            cardStars={cardStars}
            onOpenCardUpgrade={(cardId) => setCardUpgradeModalId(cardId)}
          />
        </Suspense>
      )}

      {/* Артефакты */}
      {gamePhase === 'playing' && (screen === 'artifacts' || selectedArtifact) && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Мастерская крафта */}
      {gamePhase === 'playing' && screen === 'craft' && (
        <Suspense fallback={null}>
          <CraftScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            materials={materials}
            balance={crystals}
            craftArtifact={craftArtifact}
            setScreen={setScreen}
          />
        </Suspense>
      )}
      {/* Shop / Магазин */}
      {gamePhase === 'playing' && screen === 'shop' && (
        <Suspense fallback={null}>
          <ShopScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            balance={balance}
            crystals={crystals}
            coins={coins}
            cardShards={cardShards}
            materials={materials}
            maxEnergy={maxEnergy}
            onOpenCardPack={openCharacterPack}
            onOpenLootbox={openLootbox}
            onBuyEnergyPack={(amount, gftCost) => {
              if (spendGFT(gftCost)) {
                setEnergy(prev => Math.min(maxEnergy, prev + amount));
                setEnergyRegenAt(Date.now());
                alert(`✅ +${amount} энергии за ${gftCost} GFT.`);
              }
            }}
            onBuy100Materials={() => {
              if (spendCoins(1400)) {
                setMaterials(m => m + 100);
                alert('✅ +100 материалов.');
              }
            }}
            onBuyShardPack={(amount, gftCost) => {
              if (spendGFT(gftCost)) {
                setCardShards(s => s + amount);
                alert(`✅ +${amount} карточных осколков за ${gftCost} GFT.`);
              }
            }}
            onBuyCoinsWithCrystals={buyCoinsWithCrystals}
            onBuyCoinsWithGft={buyCoinsWithGFT}
            onOpenShopXrp={() => setScreen('shopXrp')}
            onOpenShopTon={() => setScreen('shopTon')}
            onOpenMonsterPack={(packType, gftCost) => {
              if (gftCost > 0) {
                void openPremiumCharacterPack(packType);
              }
            }}
            onBuyArtifact={(rarity, gftCost) => {
              if (!spendGFT(gftCost)) return;
              const artifact = createArtifact(randomItem(ARTIFACT_TYPES), 'battlepass', rarity);
              setArtifacts(prev => [...prev, artifact]);
              setReceivedArtifact({ artifact, source: 'battlepass', subtitle: 'Покупка в магазине' });
              alert(`✅ Артефакт ${rarity} куплен за ${gftCost} GFT.`);
            }}
            onBuySeasonPass={(tier, gftCost) => {
              if (!spendGFT(gftCost)) return;
              if (tier === 'premium') {
                setBattlePassPremium(true);
                alert('✅ Премиум сезонный пропуск активирован.');
                return;
              }
              earnCoins(2500);
              setCardShards(s => s + 20);
              alert('✅ Базовый сезонный пропуск куплен: +2500 монет и +20 осколков.');
            }}
            onBuyVip={(gftCost) => {
              if (!spendGFT(gftCost)) return;
              setEnergy(maxEnergy);
              setEnergyRegenAt(Date.now());
              earnCoins(3000);
              alert('✅ VIP активирован: энергия восстановлена, +3000 монет.');
            }}
            onBuyCrystalsWithGft={buyCrystalsWithGFT}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'shopXrp' && (
        <Suspense fallback={null}>
          <ShopXrpSubscreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            shopCoinPacks={shopCoinPacks}
            xrpCoinBusy={xrpCoinBusy}
            onBack={() => setScreen('shop')}
            onStartXrpCoinPurchase={startXrpCoinPurchase}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'shopTon' && (
        <Suspense fallback={null}>
          <ShopTonSubscreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            shopCoinPacks={shopCoinPacks}
            tonCoinBusy={tonCoinBusy}
            onBack={() => setScreen('shop')}
            onStartTonShopPurchase={startTonShopPurchase}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'gftWallet' && (
        <Suspense fallback={null}>
          <GFTWalletScreen
            background={getBackground()}
            contentInset={mainScrollPadding}
            bottomInsetPx={mainInsets.bottom}
            playerId={playerId || null}
            balance={balance}
            xrplAccount={xrplAccount}
            onProgressSync={syncFromServerProgress}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'adminLogin' && (
        <Suspense fallback={null}>
          <AdminLogin
            background={getBackground()}
            contentInset={mainScrollPadding}
            bottomInsetPx={mainInsets.bottom}
            onAuthenticated={() => setScreen('adminDashboard')}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'adminDashboard' && (
        <Suspense fallback={null}>
          <AdminDashboard
            background={getBackground()}
            contentInset={mainScrollPadding}
            bottomInsetPx={mainInsets.bottom}
            onOpenEconomyDashboard={() => setScreen('economyDashboard')}
          />
        </Suspense>
      )}

      {gamePhase === 'playing' && screen === 'economyDashboard' && (
        <Suspense fallback={null}>
          <EconomyDashboard
            background={getBackground()}
            contentInset={mainScrollPadding}
            bottomInsetPx={mainInsets.bottom}
          />
        </Suspense>
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

      {withdrawOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 170,
            background: 'rgba(2,6,23,0.86)',
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !withdrawBusy) setWithdrawOpen(false);
          }}
        >
          <div
            style={{
              width: 'min(440px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(20,40,30,0.95) 100%)',
              border: '1px solid rgba(34,197,94,0.35)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              color: '#e2e8f0',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '17px' }}>Вывод GFT</div>
              <button
                onClick={() => !withdrawBusy && setWithdrawOpen(false)}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px' }}>
              Заявка ставится в очередь. Админ подпишет XRPL-транзакцию treasury → ваш адрес вручную в течение нескольких часов. Лимиты: <strong style={{ color: '#cbd5f5' }}>от 100 до 1000 GFT</strong>, кулдаун <strong style={{ color: '#cbd5f5' }}>12 часов</strong>. Получатель должен иметь trustline для GFT.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Сумма (GFT)
              </label>
              <input
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                disabled={withdrawBusy}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#0a0a0a',
                  color: '#fff',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
              />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Доступно: <span style={{ color: '#22c55e' }}>{balance}</span> GFT
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Куда отправить
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <button
                  onClick={() => {
                    setWithdrawDestMode('bound');
                    if (xrplAccount) setWithdrawDest(xrplAccount);
                  }}
                  disabled={withdrawBusy || !xrplAccount}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid ' + (withdrawDestMode === 'bound' ? '#22c55e' : '#334155'),
                    background: withdrawDestMode === 'bound' ? 'rgba(34,197,94,0.15)' : '#0f172a',
                    color: '#e2e8f0',
                    cursor: withdrawBusy || !xrplAccount ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Привязанный Xaman
                </button>
                <button
                  onClick={() => setWithdrawDestMode('custom')}
                  disabled={withdrawBusy}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid ' + (withdrawDestMode === 'custom' ? '#22c55e' : '#334155'),
                    background: withdrawDestMode === 'custom' ? 'rgba(34,197,94,0.15)' : '#0f172a',
                    color: '#e2e8f0',
                    cursor: withdrawBusy ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Другой адрес
                </button>
              </div>
              {withdrawDestMode === 'bound' ? (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#0a0a0a',
                    color: xrplAccount ? '#cbd5f5' : '#64748b',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {xrplAccount ?? 'Не подключён — выбери «Другой адрес».'}
                </div>
              ) : (
                <input
                  value={withdrawDest}
                  onChange={e => setWithdrawDest(e.target.value.trim())}
                  placeholder="rXxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={withdrawBusy}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#0a0a0a',
                    color: '#fff',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              )}
            </div>

            <button
              onClick={submitWithdraw}
              disabled={withdrawBusy}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: withdrawBusy ? '#475569' : '#22c55e',
                color: '#0b1120',
                fontWeight: 700,
                cursor: withdrawBusy ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                marginBottom: '14px',
              }}
            >
              {withdrawBusy ? 'Отправка…' : 'Отправить заявку'}
            </button>

            <div style={{ borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>История заявок</div>
                <button
                  onClick={() => void refreshWithdrawHistory()}
                  disabled={withdrawHistoryBusy}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#cbd5f5',
                    cursor: withdrawHistoryBusy ? 'wait' : 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {withdrawHistoryBusy ? '…' : 'Обновить'}
                </button>
              </div>
              {withdrawHistory === null ? (
                <div style={{ fontSize: '12px', color: '#64748b' }}>Загрузка…</div>
              ) : withdrawHistory.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#64748b' }}>Заявок ещё не было.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {withdrawHistory.map(w => {
                    const colorByStatus =
                      w.status === 'paid'
                        ? '#22c55e'
                        : w.status === 'rejected' || w.status === 'failed'
                          ? '#ef4444'
                          : w.status === 'signing'
                            ? '#facc15'
                            : '#60a5fa';
                    const labelByStatus: Record<typeof w.status, string> = {
                      queued: 'В очереди',
                      signing: 'На подписи',
                      paid: 'Выплачено',
                      rejected: 'Отклонено',
                      failed: 'Ошибка',
                    };
                    return (
                      <div
                        key={w.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: 'rgba(15,23,42,0.6)',
                          border: '1px solid rgba(148,163,184,0.15)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                            {w.amount} GFT
                          </span>
                          <span style={{ color: colorByStatus, fontWeight: 600 }}>{labelByStatus[w.status]}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px', marginTop: '2px', wordBreak: 'break-all' }}>
                          → {w.destination.slice(0, 8)}…{w.destination.slice(-6)}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                          {new Date(w.createdAt).toLocaleString()}
                        </div>
                        {w.txid && (
                          <div style={{ color: '#22c55e', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px', wordBreak: 'break-all' }}>
                            tx: {w.txid.slice(0, 12)}…{w.txid.slice(-8)}
                          </div>
                        )}
                        {w.rejectedReason && (
                          <div style={{ color: '#fca5a5', fontSize: '11px', marginTop: '2px' }}>
                            Причина: {w.rejectedReason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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