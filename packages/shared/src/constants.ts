import type { GameMode } from './types.ts';

export const DEFAULT_APP_NAME = 'مِضمار القوافي';

export const XP_CONFIG = {
  BASE_CORRECT_XP: 25,
  DAILY_CHALLENGE_MULTIPLIER: 1.5,
  FAST_ANSWER_THRESHOLD_MS: 6000,
  FAST_ANSWER_BONUS_XP: 10,
  PERFECT_ROUND_BONUS_XP: 40,
  STREAK_DAILY_BONUS_XP: 15,
  MAX_STREAK_BONUS_XP: 75,
} as const;

export const LEVEL_THRESHOLDS = [
  0,     // Level 1
  120,   // Level 2
  300,   // Level 3
  550,   // Level 4
  900,   // Level 5
  1350,  // Level 6
  1900,  // Level 7
  2550,  // Level 8
  3300,  // Level 9
  4200,  // Level 10
  5300,  // Level 11
  6600,  // Level 12
  8100,  // Level 13
  9800,  // Level 14
  12000, // Level 15
] as const;

export function calculateLevelFromXp(totalXp: number): number {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (safeXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  if (safeXp >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) {
    const extraLevels = Math.floor(
      (safeXp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) / 2500
    );
    level = LEVEL_THRESHOLDS.length + extraLevels;
  }
  return level;
}

export function getLevelBounds(level: number): {
  currentLevelFloorXp: number;
  nextLevelXp: number;
} {
  const safeLevel = Math.max(1, level);
  if (safeLevel < LEVEL_THRESHOLDS.length) {
    return {
      currentLevelFloorXp: LEVEL_THRESHOLDS[safeLevel - 1],
      nextLevelXp: LEVEL_THRESHOLDS[safeLevel],
    };
  }
  const lastDefined = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const offset = safeLevel - LEVEL_THRESHOLDS.length;
  return {
    currentLevelFloorXp: lastDefined + offset * 2500,
    nextLevelXp: lastDefined + (offset + 1) * 2500,
  };
}

export function getLevelProgressPercent(totalXp: number): number {
  const level = calculateLevelFromXp(totalXp);
  const { currentLevelFloorXp, nextLevelXp } = getLevelBounds(level);
  const span = Math.max(1, nextLevelXp - currentLevelFloorXp);
  const progress = ((totalXp - currentLevelFloorXp) / span) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function getRankTitleAr(level: number): string {
  if (level >= 15) return 'أمير القوافي';
  if (level >= 12) return 'ناقد البلاغة';
  if (level >= 9) return 'شاعر الفصحى';
  if (level >= 6) return 'أديب البيان';
  if (level >= 3) return 'راوي الدواوين';
  return 'طالب الأدب';
}

export const GAME_MODES_META: Record<
  GameMode,
  {
    id: GameMode;
    titleAr: string;
    subtitleAr: string;
    descriptionAr: string;
    questionCount: number;
    timeLimitSeconds: number;
    xpMultiplierLabel: string;
  }
> = {
  who_said: {
    id: 'who_said',
    titleAr: 'من قائل البيت؟',
    subtitleAr: 'نسبة الأبيات إلى أصحابها',
    descriptionAr:
      'يُعرض عليك بيت شعر موثّق، وعليك التعرّف إلى ناظمه من بين أربعة شعراء.',
    questionCount: 5,
    timeLimitSeconds: 25,
    xpMultiplierLabel: '٢٥ نقطة للبيت',
  },
  complete_verse: {
    id: 'complete_verse',
    titleAr: 'أكمل البيت',
    subtitleAr: 'موافقة العجز للصدر والرويّ',
    descriptionAr:
      'اقرأ صدر البيت وتذوّق وزنه وقافيته، ثم اختر عجزه الصحيح من الأبيات الموثّقة.',
    questionCount: 5,
    timeLimitSeconds: 30,
    xpMultiplierLabel: '٢٥ نقطة للبيت',
  },
  era_challenge: {
    id: 'era_challenge',
    titleAr: 'تحدي العصور',
    subtitleAr: 'خريطة الأدب عبر الحقب',
    descriptionAr:
      'اختبر معرفتك بانتماء الشعراء والقصائد إلى عصورهم التاريخية من الجاهلية إلى العصر الحديث.',
    questionCount: 5,
    timeLimitSeconds: 25,
    xpMultiplierLabel: '٢٥ نقطة للبيت',
  },
  daily_challenge: {
    id: 'daily_challenge',
    titleAr: 'التحدي اليومي',
    subtitleAr: 'منافسة اليوم الموحدة',
    descriptionAr:
      'خمسة أسئلة متجددة كل يوم لجميع القرّاء مع مضاعفة نقاط الخبرة وحفظ سلسلة الأيام.',
    questionCount: 5,
    timeLimitSeconds: 25,
    xpMultiplierLabel: 'مكافأة ١.٥× يومية',
  },
};

export const AVATAR_OPTIONS = [
  { id: 'scholar_astrolabe', labelAr: 'الأسطرلاب الذهبي' },
  { id: 'classical_desert', labelAr: 'قمر البادية' },
  { id: 'andalus_arch', labelAr: 'فناء الأندلس' },
  { id: 'qalam_ink', labelAr: 'القلم والمداد' },
] as const;
