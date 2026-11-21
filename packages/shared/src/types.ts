export type GameMode =
  | 'who_said'
  | 'complete_verse'
  | 'era_challenge'
  | 'daily_challenge';

export type ThemeMode = 'light' | 'dark';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all_time';

export interface Era {
  id: number;
  sourceId: number | null;
  slug: string;
  nameAr: string;
  nameEn: string;
  periodLabel: string;
  description: string;
  sortOrder: number;
}

export interface Meter {
  id: number;
  sourceId: number | null;
  slug: string;
  nameAr: string;
  patternAr: string;
  description: string;
}

export interface Theme {
  id: number;
  sourceId: number | null;
  slug: string;
  nameAr: string;
  description: string;
}

export interface Rhyme {
  id: number;
  sourceId: number | null;
  letter: string;
  nameAr: string;
}

export interface PoemType {
  id: number;
  sourceId: number | null;
  slug: string;
  nameAr: string;
}

export interface Poet {
  id: number;
  sourceId: number | null;
  slug: string;
  nameAr: string;
  titleAr: string | null;
  eraId: number;
  eraNameAr?: string;
  birthYearLabel: string | null;
  deathYearLabel: string | null;
  bioAr: string;
  avatarKey: string | null;
  poemCount?: number;
}

export interface PoemVerse {
  id: number;
  poemId: number;
  verseOrder: number;
  sadr: string;
  ajuz: string;
}

export interface PoemSummary {
  id: number;
  sourceId: number | null;
  titleAr: string;
  poetId: number;
  poetNameAr: string;
  eraId: number;
  eraNameAr: string;
  meterId: number | null;
  meterNameAr: string | null;
  themeId: number | null;
  themeNameAr: string | null;
  rhymeId: number | null;
  rhymeNameAr: string | null;
  poemTypeId: number | null;
  poemTypeNameAr: string | null;
  verseCount: number;
  excerptSadr: string;
  excerptAjuz: string;
}

export interface PoemDetail extends PoemSummary {
  poetBioAr: string;
  poetEraPeriod: string;
  verses: PoemVerse[];
}

export interface QuestionOption {
  id: string;
  label: string;
  secondaryLabel?: string;
}

export interface ChallengeQuestion {
  id: string;
  orderIndex: number;
  mode: GameMode;
  promptAr: string;
  verseSadr: string;
  verseAjuz?: string;
  poemId: number;
  verseId: number;
  eraNameAr: string;
  meterNameAr: string | null;
  options: QuestionOption[];
  timeLimitSeconds: number;
}

export interface QuestionFeedback {
  questionId: string;
  isCorrect: boolean;
  correctOptionId: string;
  correctOptionLabel: string;
  selectedOptionId: string;
  poetNameAr: string;
  poemTitleAr: string;
  eraNameAr: string;
  meterNameAr: string | null;
  fullVerseSadr: string;
  fullVerseAjuz: string;
  pointsAwarded: number;
}

export interface GameAnswerReview extends QuestionFeedback {
  promptAr: string;
  responseTimeMs: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  avatarId: string;
  bio: string;
  timezone: string;
  createdAt: string;
}

export interface PlayerStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  gamesPlayed: number;
  totalQuestions: number;
  correctAnswers: number;
  dailyChallengesCompleted: number;
}

export interface PlayerSettings {
  theme: ThemeMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showOnLeaderboard: boolean;
  shareActivityPublicly: boolean;
}

export interface Achievement {
  id: number;
  code: string;
  titleAr: string;
  descriptionAr: string;
  category: string;
  xpBonus: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface ChallengeHistoryItem {
  sessionId: string;
  mode: GameMode;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  xpEarned: number;
  durationSeconds: number;
  completedAt: string;
  isOfflineSynced?: boolean;
}

export interface SessionResult {
  sessionId: string;
  mode: GameMode;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  accuracy: number;
  durationSeconds: number;
  xpEarned: number;
  streakBonusXp: number;
  speedBonusXp: number;
  newTotalXp: number;
  previousLevel: number;
  newLevel: number;
  currentStreak: number;
  newlyUnlockedAchievements: Achievement[];
  reviews: GameAnswerReview[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  accuracy: number;
  gamesPlayed: number;
  currentStreak: number;
}

export interface AuthSessionUser {
  profile: UserProfile;
  stats: PlayerStats;
  settings: PlayerSettings;
}

export interface GuestProgressSnapshot {
  guestId: string;
  displayName: string;
  avatarId: string;
  stats: PlayerStats;
  history: ChallengeHistoryItem[];
  unlockedAchievementCodes: string[];
  dailyCompletedDates: string[];
}

export interface OfflineQuestionPack {
  packId: string;
  generatedAt: string;
  mode: GameMode;
  questions: Array<
    ChallengeQuestion & {
      correctOptionId: string;
      poetNameAr: string;
      poemTitleAr: string;
      fullVerseSadr: string;
      fullVerseAjuz: string;
    }
  >;
}

export interface OfflinePackPayload {
  version: string;
  downloadedAt: string;
  eras: Era[];
  meters: Meter[];
  themes: Theme[];
  poets: Poet[];
  poems: PoemDetail[];
  questionPacks: OfflineQuestionPack[];
}

export interface PendingSyncSession {
  operationId: string;
  mode: GameMode;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  answers: Array<{
    questionId: string;
    poemId: number;
    verseId: number;
    selectedOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    responseTimeMs: number;
    promptAr: string;
    fullVerseSadr: string;
    fullVerseAjuz: string;
    poetNameAr: string;
    poemTitleAr: string;
    eraNameAr: string;
    meterNameAr: string | null;
    correctOptionLabel: string;
  }>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
