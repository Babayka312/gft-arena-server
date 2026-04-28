import type { CardPackType } from '../cards/acquisition';
import type { ArtifactRarity, ArtifactType } from '../artifacts/types';

export type BattlePassReward = {
  label: string;
  coins?: number;
  crystals?: number;
  materials?: number;
  shards?: number;
  cardPack?: CardPackType;
  artifact?: { type?: ArtifactType; rarity: ArtifactRarity };
};

export type BattlePassTier = {
  level: number;
  free: BattlePassReward;
  paid: BattlePassReward;
};

export type BattlePassQuestKind =
  | 'onboarding'
  | 'pve_training'
  | 'hold_start'
  | 'pvp_start'
  | 'pve_start'
  | 'card_pack_open'
  | 'premium_elite';

export type BattlePassQuest = {
  id: BattlePassQuestKind;
  title: string;
  description: string;
  target: number;
  xpPerStep: number;
  accent: string;
  track?: 'free' | 'paid';
};

export const BATTLEPASS_PRICE_GFT = 120;

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

export const BATTLEPASS_TIERS: BattlePassTier[] = [...BATTLEPASS_TIERS_FIRST, ...BATTLEPASS_TIERS_REST];

export const BATTLEPASS_XP_PER_LEVEL = 100;

export const BATTLEPASS_QUESTS: BattlePassQuest[] = [
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

export function createBattlePassProgress(): Record<BattlePassQuestKind, number> {
  return BATTLEPASS_QUESTS.reduce(
    (progress, quest) => ({ ...progress, [quest.id]: 0 }),
    {} as Record<BattlePassQuestKind, number>,
  );
}
