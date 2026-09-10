export interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  perClick?: number;
  perSecond?: number;
  level: number;
  maxLevel?: number;
  unlockAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (state: GameState) => boolean;
  reward: number;
  unlocked: boolean;
}

export interface AntStage {
  name: string;
  icon: string;
  minLevel: number;
  description: string;
}

export const ANT_STAGES: AntStage[] = [
  { name: 'Яйцо', icon: '🥚', minLevel: 0, description: 'Ещё не муравей, но уже почти!' },
  { name: 'Личинка', icon: '🐛', minLevel: 5, description: 'Маленькая, но голодная' },
  { name: 'Муравей-рабочий', icon: '🐜', minLevel: 15, description: 'Первые шаги в колонию' },
  { name: 'Муравей-солдат', icon: '🪲', minLevel: 30, description: 'Защитник колонии' },
  { name: 'Муравей-разведчик', icon: '🦗', minLevel: 50, description: 'Находит лучшие ресурсы' },
  { name: 'Муравей-генерал', icon: '⚔️', minLevel: 80, description: 'Командует армией' },
  { name: 'Королева', icon: '👑', minLevel: 120, description: 'Правительница колонии' },
  { name: 'ЛЕГЕНДА', icon: '🌟', minLevel: 200, description: 'Супер муравей!' },
];

export const INITIAL_UPGRADES: Upgrade[] = [
  {
    id: 'jaws',
    name: 'Крепкие челюсти',
    description: '+1 за тап',
    icon: '🦷',
    baseCost: 10,
    costMultiplier: 1.4,
    perClick: 1,
    level: 0,
    unlockAt: 0,
  },
  {
    id: 'worker',
    name: 'Рабочий муравей',
    description: '+1/сек',
    icon: '🐜',
    baseCost: 25,
    costMultiplier: 1.5,
    perSecond: 1,
    level: 0,
    unlockAt: 20,
  },
  {
    id: 'antenna',
    name: 'Чуткие усики',
    description: '+3 за тап',
    icon: '📡',
    baseCost: 100,
    costMultiplier: 1.5,
    perClick: 3,
    level: 0,
    unlockAt: 50,
  },
  {
    id: 'tunnel',
    name: 'Туннель',
    description: '+5/сек',
    icon: '🕳️',
    baseCost: 250,
    costMultiplier: 1.6,
    perSecond: 5,
    level: 0,
    unlockAt: 150,
  },
  {
    id: 'armor',
    name: 'Хитиновый панцирь',
    description: '+10 за тап',
    icon: '🛡️',
    baseCost: 500,
    costMultiplier: 1.5,
    perClick: 10,
    level: 0,
    unlockAt: 400,
  },
  {
    id: 'farm',
    name: 'Грибная ферма',
    description: '+20/сек',
    icon: '🍄',
    baseCost: 1500,
    costMultiplier: 1.6,
    perSecond: 20,
    level: 0,
    unlockAt: 1000,
  },
  {
    id: 'army',
    name: 'Армия муравьёв',
    description: '+50/сек',
    icon: '⚔️',
    baseCost: 5000,
    costMultiplier: 1.7,
    perSecond: 50,
    level: 0,
    unlockAt: 3000,
  },
  {
    id: 'queen',
    name: 'Муравьиная матка',
    description: '+200/сек',
    icon: '👸',
    baseCost: 20000,
    costMultiplier: 1.8,
    perSecond: 200,
    level: 0,
    unlockAt: 15000,
  },
  {
    id: 'megajaw',
    name: 'Мега-челюсти',
    description: '+50 за тап',
    icon: '💪',
    baseCost: 10000,
    costMultiplier: 1.6,
    perClick: 50,
    level: 0,
    unlockAt: 8000,
  },
  {
    id: 'portal',
    name: 'Портал в муравейник',
    description: '+1000/сек',
    icon: '🌀',
    baseCost: 100000,
    costMultiplier: 2.0,
    perSecond: 1000,
    level: 0,
    unlockAt: 75000,
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_tap', name: 'Первый шаг', description: 'Сделай первый тап', icon: '👆', condition: (s) => s.totalTaps >= 1, reward: 5, unlocked: false },
  { id: 'tap_10', name: 'Начинающий', description: '10 тапов', icon: '🌱', condition: (s) => s.totalTaps >= 10, reward: 10, unlocked: false },
  { id: 'tap_100', name: 'Кликер', description: '100 тапов', icon: '💥', condition: (s) => s.totalTaps >= 100, reward: 50, unlocked: false },
  { id: 'tap_500', name: 'Маньяк', description: '500 тапов', icon: '🔥', condition: (s) => s.totalTaps >= 500, reward: 200, unlocked: false },
  { id: 'tap_1000', name: 'Легенда', description: '1000 тапов', icon: '🏆', condition: (s) => s.totalTaps >= 1000, reward: 500, unlocked: false },
  { id: 'food_100', name: 'Собиратель', description: 'Собери 100 еды', icon: '🍎', condition: (s) => s.totalEarned >= 100, reward: 25, unlocked: false },
  { id: 'food_1000', name: 'Торговец', description: '1000 еды', icon: '💰', condition: (s) => s.totalEarned >= 1000, reward: 100, unlocked: false },
  { id: 'food_10000', name: 'Богач', description: '10000 еды', icon: '💎', condition: (s) => s.totalEarned >= 10000, reward: 500, unlocked: false },
  { id: 'food_100000', name: 'Магнат', description: '100000 еды', icon: '🏰', condition: (s) => s.totalEarned >= 100000, reward: 2000, unlocked: false },
  { id: 'upgrade_1', name: 'Первый апгрейд', description: 'Купи улучшение', icon: '⬆️', condition: (s) => s.upgrades.some(u => u.level > 0), reward: 15, unlocked: false },
  { id: 'upgrade_5', name: 'Коллекционер', description: '5 улучшений', icon: '📦', condition: (s) => s.upgrades.filter(u => u.level > 0).length >= 5, reward: 100, unlocked: false },
  { id: 'prestige_1', name: 'Перерождение', description: 'Первый престиж', icon: '✨', condition: (s) => s.prestigeLevel >= 1, reward: 0, unlocked: false },
  { id: 'bonus_1', name: 'Везунчик', description: 'Получи бонус', icon: '🎰', condition: (s) => s.bonusCount >= 1, reward: 20, unlocked: false },
  { id: 'bonus_20', name: 'Золотая жила', description: '20 бонусов', icon: '🌈', condition: (s) => s.bonusCount >= 20, reward: 500, unlocked: false },
];

export interface GameState {
  food: number;
  totalEarned: number;
  totalTaps: number;
  clickPower: number;
  perSecond: number;
  upgrades: Upgrade[];
  achievements: Achievement[];
  prestigeLevel: number;
  prestigeMultiplier: number;
  bonusCount: number;
  lastSaveTime: number;
  dailyRewardClaimed: string;
  x3Active: boolean;
  x3EndTime: number;
  antLevel: number;
}

export const INITIAL_STATE: GameState = {
  food: 0,
  totalEarned: 0,
  totalTaps: 0,
  clickPower: 1,
  perSecond: 0,
  upgrades: INITIAL_UPGRADES.map(u => ({ ...u })),
  achievements: ACHIEVEMENTS.map(a => ({ ...a })),
  prestigeLevel: 0,
  prestigeMultiplier: 1,
  bonusCount: 0,
  lastSaveTime: Date.now(),
  dailyRewardClaimed: '',
  x3Active: false,
  x3EndTime: 0,
  antLevel: 0,
};

export function getUpgradeCost(upgrade: Upgrade): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

export function getAntStage(level: number): AntStage {
  let stage = ANT_STAGES[0];
  for (const s of ANT_STAGES) {
    if (level >= s.minLevel) stage = s;
  }
  return stage;
}

export function formatNumber(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
