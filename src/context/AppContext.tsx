import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserCredential } from 'firebase/auth';
import {
  DEFAULT_APP_NAME,
  GAME_MODES_META,
  XP_CONFIG,
  calculateLevelFromXp,
  type AuthSessionUser,
  type ChallengeQuestion,
  type GameAnswerReview,
  type GameMode,
  type GuestProgressSnapshot,
  type OfflinePackPayload,
  type PendingSyncSession,
  type PlayerSettings,
  type PlayerStats,
  type QuestionFeedback,
  type SessionResult,
  type ThemeMode,
} from '../../packages/shared/src/index.ts';
import { apiClient, setAccessToken } from '../services/apiClient.ts';
import {
  createUserWithEmailAndPassword,
  firebaseAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile,
} from '../services/firebase.ts';
import {
  createDefaultGuestProgress,
  createDefaultSettings,
  offlineDb,
} from '../storage/offlineDb.ts';
import {
  getLocalCalendarDate,
  getUserTimezone,
  playFeedbackTone,
  triggerHaptic,
} from '../utils/feedback.ts';

export type ScreenId =
  | 'home'
  | 'modes'
  | 'play'
  | 'results'
  | 'profile'
  | 'leaderboards'
  | 'library'
  | 'settings';

export interface ActiveGameSessionState {
  sessionId: string;
  mode: GameMode;
  isOfflineMode: boolean;
  startedAtIso: string;
  startTimestampMs: number;
  questions: ChallengeQuestion[];
  offlineAnswersMap?: Record<
    string,
    {
      correctOptionId: string;
      correctOptionLabel: string;
      poetNameAr: string;
      poemTitleAr: string;
      fullVerseSadr: string;
      fullVerseAjuz: string;
    }
  >;
  currentIndex: number;
  selectedOptionId: string | null;
  currentFeedback: QuestionFeedback | null;
  reviews: GameAnswerReview[];
  questionStartedAtMs: number;
}

interface AppContextValue {
  appName: string;
  screen: ScreenId;
  navigate: (screen: ScreenId) => void;
  user: AuthSessionUser | null;
  guest: GuestProgressSnapshot;
  activeStats: PlayerStats;
  activeDisplayName: string;
  activeAvatarId: string;
  settings: PlayerSettings;
  isOnline: boolean;
  backendAvailable: boolean;
  backendChecked: boolean;
  recheckBackend: () => Promise<void>;
  isAuthReady: boolean;
  offlinePack: OfflinePackPayload | null;
  pendingSyncCount: number;
  dailyCompleted: boolean;
  activeGame: ActiveGameSessionState | null;
  lastResult: SessionResult | null;
  bannerNotice: { type: 'success' | 'error' | 'info'; message: string } | null;
  clearNotice: () => void;
  showNotice: (type: 'success' | 'error' | 'info', message: string) => void;
  setTheme: (theme: ThemeMode) => Promise<void>;
  updateSettings: (partial: Partial<PlayerSettings>) => Promise<void>;
  startChallenge: (mode: GameMode, eraId?: number) => Promise<void>;
  submitCurrentAnswer: (optionId: string) => Promise<void>;
  advanceNextQuestion: () => Promise<void>;
  abandonChallenge: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    displayName: string;
    username: string;
    email: string;
    password: string;
    migrateGuestProgress: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserFromServer: (user: AuthSessionUser) => void;
  downloadOfflinePack: () => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  refreshDailyStatus: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appName = (import.meta.env.VITE_APP_NAME as string | undefined) || DEFAULT_APP_NAME;

  const [screen, setScreen] = useState<ScreenId>('home');
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [guest, setGuest] = useState<GuestProgressSnapshot>(createDefaultGuestProgress);
  const [settings, setSettings] = useState<PlayerSettings>(createDefaultSettings);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [backendChecked, setBackendChecked] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [offlinePack, setOfflinePack] = useState<OfflinePackPayload | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [activeGame, setActiveGame] = useState<ActiveGameSessionState | null>(null);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotice = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setBannerNotice({ type, message });
  }, []);

  const clearNotice = useCallback(() => {
    setBannerNotice(null);
  }, []);

  const applyThemeClass = useCallback((theme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const recheckBackend = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setBackendAvailable(false);
      setBackendChecked(true);
      return;
    }
    const health = await apiClient.checkBackendHealth();
    setBackendAvailable(health.available);
    setBackendChecked(true);
  }, []);

  const refreshDailyStatus = useCallback(async () => {
    const today = getLocalCalendarDate();
    if (!isOnline || !backendAvailable) {
      setDailyCompleted(guest.dailyCompletedDates.includes(today));
      return;
    }
    try {
      const status = await apiClient.getDailyStatus(getUserTimezone());
      setDailyCompleted(
        user ? status.alreadyCompleted : guest.dailyCompletedDates.includes(today)
      );
    } catch {
      setDailyCompleted(guest.dailyCompletedDates.includes(today));
    }
  }, [backendAvailable, guest.dailyCompletedDates, isOnline, user]);

  const syncOfflineQueue = useCallback(async () => {
    if (!user || !isOnline || !backendAvailable) return;
    const pending = await offlineDb.getPendingSyncSessions();
    setPendingSyncCount(pending.length);
    if (pending.length === 0) return;

    try {
      const result = await apiClient.syncPendingSessions(pending, getUserTimezone());
      const processed = [...result.syncedOperationIds, ...result.skippedOperationIds];
      await offlineDb.removePendingSyncSessions(processed);
      const remaining = await offlineDb.getPendingSyncSessions();
      setPendingSyncCount(remaining.length);
      if (result.user) {
        setUser(result.user);
      }
      if (result.syncedOperationIds.length > 0) {
        showNotice('success', `تمت مزامنة ${result.syncedOperationIds.length} جولات غير متصلة بنجاح.`);
      }
    } catch {
      // Keep queued for next reconnect
    }
  }, [backendAvailable, isOnline, showNotice, user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [localGuest, localSettings, cachedPack, pending, health] = await Promise.all([
        offlineDb.getGuestProgress(),
        offlineDb.getLocalSettings(),
        offlineDb.getOfflinePack(),
        offlineDb.getPendingSyncSessions(),
        apiClient.checkBackendHealth(),
      ]);

      if (!mounted) return;
      setGuest(localGuest);
      setSettings(localSettings);
      applyThemeClass(localSettings.theme);
      setOfflinePack(cachedPack);
      setPendingSyncCount(pending.length);
      setBackendAvailable(health.available);
      setBackendChecked(true);

      if (health.available) {
        const refreshed = await apiClient.refreshSession();
        if (!mounted) return;
        if (refreshed) {
          setUser(refreshed.user);
          setSettings(refreshed.user.settings);
          applyThemeClass(refreshed.user.settings.theme);
          await offlineDb.saveLocalSettings(refreshed.user.settings);
        }

        if (!cachedPack) {
          try {
            const pack = await apiClient.downloadOfflinePack();
            if (mounted) {
              setOfflinePack(pack);
              await offlineDb.saveOfflinePack(pack);
            }
          } catch {
            // Non-blocking
          }
        }
      }

      if (mounted) setIsAuthReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, [applyThemeClass]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      void recheckBackend().then(() => syncOfflineQueue());
    };
    const onOffline = () => {
      setIsOnline(false);
      setBackendAvailable(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [recheckBackend, syncOfflineQueue]);

  useEffect(() => {
    if (isAuthReady) {
      void refreshDailyStatus();
    }
  }, [isAuthReady, refreshDailyStatus]);

  useEffect(() => {
    if (user && isOnline && backendAvailable) {
      void syncOfflineQueue();
    }
  }, [backendAvailable, isOnline, syncOfflineQueue, user]);

  const navigate = useCallback((next: ScreenId) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<PlayerSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      applyThemeClass(next.theme);
      await offlineDb.saveLocalSettings(next);

      if (user && isOnline && backendAvailable) {
        try {
          const saved = await apiClient.updateSettings(partial);
          setUser((prev) => (prev ? { ...prev, settings: saved } : prev));
        } catch {
          // Persisted locally
        }
      }
    },
    [applyThemeClass, backendAvailable, isOnline, settings, user]
  );

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      await updateSettings({ theme });
    },
    [updateSettings]
  );

  const startChallenge = useCallback(
    async (mode: GameMode, eraId?: number) => {
      clearNotice();
      const tz = getUserTimezone();
      const today = getLocalCalendarDate();

      if (mode === 'daily_challenge' && dailyCompleted) {
        showNotice('info', 'لقد أتممت التحدي اليومي لهذا اليوم، عد غداً لتحدٍّ جديد.');
        return;
      }

      if (isOnline && backendAvailable) {
        try {
          const started = await apiClient.startGameSession({
            mode,
            eraId,
            questionCount: GAME_MODES_META[mode].questionCount,
            timezone: tz,
          });
          setActiveGame({
            sessionId: started.sessionId,
            mode: started.mode,
            isOfflineMode: false,
            startedAtIso: new Date().toISOString(),
            startTimestampMs: Date.now(),
            questions: started.questions,
            currentIndex: 0,
            selectedOptionId: null,
            currentFeedback: null,
            reviews: [],
            questionStartedAtMs: Date.now(),
          });
          setScreen('play');
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'تعذر بدء التحدي';
          if (msg.includes('التحدي اليومي')) {
            setDailyCompleted(true);
            showNotice('info', msg);
            return;
          }
        }
      }

      if (!offlinePack || offlinePack.questionPacks.length === 0) {
        showNotice(
          'info',
          'يعمل التطبيق حالياً في وضع معاينة الواجهة دون خادم خلفي متصل. شغّل خادم الواجهة البرمجية (npm run dev:api) لتوليد الأسئلة من قاعدة البيانات.'
        );
        return;
      }

      const targetPack =
        offlinePack.questionPacks.find((p) => p.mode === (mode === 'daily_challenge' ? 'who_said' : mode)) ||
        offlinePack.questionPacks[0];

      const shuffled = [...targetPack.questions].sort(() => Math.random() - 0.5).slice(0, 5);
      const answerMap: ActiveGameSessionState['offlineAnswersMap'] = {};
      const stripped: ChallengeQuestion[] = shuffled.map((q, idx) => {
        answerMap[q.id] = {
          correctOptionId: q.correctOptionId,
          correctOptionLabel:
            q.options.find((o) => o.id === q.correctOptionId)?.label || q.poetNameAr,
          poetNameAr: q.poetNameAr,
          poemTitleAr: q.poemTitleAr,
          fullVerseSadr: q.fullVerseSadr,
          fullVerseAjuz: q.fullVerseAjuz,
        };
        return {
          id: q.id,
          orderIndex: idx,
          mode,
          promptAr: q.promptAr,
          verseSadr: q.verseSadr,
          verseAjuz: q.verseAjuz,
          poemId: q.poemId,
          verseId: q.verseId,
          eraNameAr: q.eraNameAr,
          meterNameAr: q.meterNameAr,
          options: q.options,
          timeLimitSeconds: q.timeLimitSeconds,
        };
      });

      if (mode === 'daily_challenge' && guest.dailyCompletedDates.includes(today)) {
        showNotice('info', 'لقد أتممت التحدي اليومي لهذا اليوم.');
        return;
      }

      setActiveGame({
        sessionId: crypto.randomUUID ? crypto.randomUUID() : `offline_${Date.now()}`,
        mode,
        isOfflineMode: true,
        startedAtIso: new Date().toISOString(),
        startTimestampMs: Date.now(),
        questions: stripped,
        offlineAnswersMap: answerMap,
        currentIndex: 0,
        selectedOptionId: null,
        currentFeedback: null,
        reviews: [],
        questionStartedAtMs: Date.now(),
      });
      setScreen('play');
    },
    [
      backendAvailable,
      clearNotice,
      dailyCompleted,
      guest.dailyCompletedDates,
      isOnline,
      offlinePack,
      showNotice,
    ]
  );

  const submitCurrentAnswer = useCallback(
    async (optionId: string) => {
      if (!activeGame) return;
      if (activeGame.selectedOptionId !== null || activeGame.currentFeedback !== null) {
        return;
      }

      const currentQ = activeGame.questions[activeGame.currentIndex];
      if (!currentQ) return;

      const responseTimeMs = Math.max(200, Date.now() - activeGame.questionStartedAtMs);

      let feedback: QuestionFeedback;
      if (!activeGame.isOfflineMode) {
        feedback = await apiClient.submitAnswer(activeGame.sessionId, {
          questionId: currentQ.id,
          selectedOptionId: optionId,
          responseTimeMs,
        });
      } else {
        const meta = activeGame.offlineAnswersMap?.[currentQ.id];
        const isCorrect = meta ? optionId === meta.correctOptionId : false;
        const pointsAwarded = isCorrect
          ? XP_CONFIG.BASE_CORRECT_XP +
            (responseTimeMs <= XP_CONFIG.FAST_ANSWER_THRESHOLD_MS ? XP_CONFIG.FAST_ANSWER_BONUS_XP : 0)
          : 0;
        feedback = {
          questionId: currentQ.id,
          isCorrect,
          correctOptionId: meta?.correctOptionId || '',
          correctOptionLabel: meta?.correctOptionLabel || '',
          selectedOptionId: optionId,
          poetNameAr: meta?.poetNameAr || '',
          poemTitleAr: meta?.poemTitleAr || '',
          eraNameAr: currentQ.eraNameAr,
          meterNameAr: currentQ.meterNameAr,
          fullVerseSadr: meta?.fullVerseSadr || currentQ.verseSadr,
          fullVerseAjuz: meta?.fullVerseAjuz || currentQ.verseAjuz || '',
          pointsAwarded,
        };
      }

      playFeedbackTone(feedback.isCorrect ? 'correct' : 'incorrect', settings.soundEnabled);
      triggerHaptic(feedback.isCorrect ? 'light' : 'error', settings.vibrationEnabled);

      const review: GameAnswerReview = {
        ...feedback,
        promptAr: currentQ.promptAr,
        responseTimeMs,
      };

      setActiveGame((prev) =>
        prev
          ? {
              ...prev,
              selectedOptionId: optionId,
              currentFeedback: feedback,
              reviews: [...prev.reviews, review],
            }
          : null
      );
    },
    [activeGame, settings.soundEnabled, settings.vibrationEnabled]
  );

  const advanceNextQuestion = useCallback(async () => {
    if (!activeGame) return;

    const isLast = activeGame.currentIndex >= activeGame.questions.length - 1;
    if (!isLast) {
      setActiveGame((prev) =>
        prev
          ? {
              ...prev,
              currentIndex: prev.currentIndex + 1,
              selectedOptionId: null,
              currentFeedback: null,
              questionStartedAtMs: Date.now(),
            }
          : null
      );
      return;
    }

    const durationSeconds = Math.max(1, Math.round((Date.now() - activeGame.startTimestampMs) / 1000));
    const today = getLocalCalendarDate();

    if (!activeGame.isOfflineMode) {
      const result = await apiClient.completeSession(activeGame.sessionId, {
        durationSeconds,
        timezone: getUserTimezone(),
      });

      if (user) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  totalXp: result.newTotalXp,
                  level: result.newLevel,
                  currentStreak: result.currentStreak,
                  longestStreak: Math.max(prev.stats.longestStreak, result.currentStreak),
                  lastPlayedDate: today,
                  gamesPlayed: prev.stats.gamesPlayed + 1,
                  totalQuestions: prev.stats.totalQuestions + result.totalQuestions,
                  correctAnswers: prev.stats.correctAnswers + result.correctCount,
                  dailyChallengesCompleted:
                    prev.stats.dailyChallengesCompleted + (activeGame.mode === 'daily_challenge' ? 1 : 0),
                },
              }
            : null
        );
      } else {
        const updatedGuest = await offlineDb.recordGuestSession({
          mode: activeGame.mode,
          totalQuestions: result.totalQuestions,
          correctCount: result.correctCount,
          xpEarned: result.xpEarned,
          durationSeconds,
          todayDate: today,
        });
        setGuest(updatedGuest);
        result.newTotalXp = updatedGuest.stats.totalXp;
        result.newLevel = updatedGuest.stats.level;
        result.currentStreak = updatedGuest.stats.currentStreak;
      }

      if (activeGame.mode === 'daily_challenge') {
        setDailyCompleted(true);
      }

      playFeedbackTone('complete', settings.soundEnabled);
      setLastResult(result);
      setActiveGame(null);
      setScreen('results');
      return;
    }

    const correctCount = activeGame.reviews.filter((r) => r.isCorrect).length;
    const xpEarned = activeGame.reviews.reduce((sum, r) => sum + r.pointsAwarded, 0);

    if (user) {
      const pendingItem: PendingSyncSession = {
        operationId: crypto.randomUUID ? crypto.randomUUID() : activeGame.sessionId,
        mode: activeGame.mode,
        startedAt: activeGame.startedAtIso,
        completedAt: new Date().toISOString(),
        durationSeconds,
        answers: activeGame.reviews.map((r, idx) => {
          const q = activeGame.questions[idx];
          return {
            questionId: r.questionId,
            poemId: q.poemId,
            verseId: q.verseId,
            selectedOptionId: r.selectedOptionId,
            correctOptionId: r.correctOptionId,
            isCorrect: r.isCorrect,
            responseTimeMs: r.responseTimeMs,
            promptAr: r.promptAr,
            fullVerseSadr: r.fullVerseSadr,
            fullVerseAjuz: r.fullVerseAjuz,
            poetNameAr: r.poetNameAr,
            poemTitleAr: r.poemTitleAr,
            eraNameAr: r.eraNameAr,
            meterNameAr: r.meterNameAr,
            correctOptionLabel: r.correctOptionLabel,
          };
        }),
      };
      await offlineDb.enqueueSyncSession(pendingItem);
      const pending = await offlineDb.getPendingSyncSessions();
      setPendingSyncCount(pending.length);
    } else {
      const updatedGuest = await offlineDb.recordGuestSession({
        mode: activeGame.mode,
        totalQuestions: activeGame.questions.length,
        correctCount,
        xpEarned,
        durationSeconds,
        todayDate: today,
      });
      setGuest(updatedGuest);
    }

    const activePrevXp = user ? user.stats.totalXp : guest.stats.totalXp;
    const offlineResult: SessionResult = {
      sessionId: activeGame.sessionId,
      mode: activeGame.mode,
      correctCount,
      incorrectCount: activeGame.questions.length - correctCount,
      totalQuestions: activeGame.questions.length,
      accuracy: Math.round((correctCount / Math.max(1, activeGame.questions.length)) * 100),
      durationSeconds,
      xpEarned,
      streakBonusXp: 0,
      speedBonusXp: 0,
      newTotalXp: activePrevXp + xpEarned,
      previousLevel: calculateLevelFromXp(activePrevXp),
      newLevel: calculateLevelFromXp(activePrevXp + xpEarned),
      currentStreak: user ? user.stats.currentStreak : guest.stats.currentStreak + 1,
      newlyUnlockedAchievements: [],
      reviews: activeGame.reviews,
    };

    playFeedbackTone('complete', settings.soundEnabled);
    setLastResult(offlineResult);
    setActiveGame(null);
    setScreen('results');
  }, [activeGame, guest.stats.currentStreak, guest.stats.totalXp, settings.soundEnabled, user]);

  const abandonChallenge = useCallback(() => {
    setActiveGame(null);
    setScreen('modes');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      let credential: UserCredential;
      try {
        credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code !== 'auth/user-not-found' && code !== 'auth/invalid-credential') {
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
          }
          throw error;
        }

        // Upgrade an older PostgreSQL account by creating its Firebase identity.
        try {
          credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
          await sendEmailVerification(credential.user);
          const idToken = await credential.user.getIdToken();
          await apiClient.firebaseRegister({ idToken });
          await firebaseSignOut(firebaseAuth);
          throw new Error('تم ربط حسابك السابق. أرسلنا رابط تأكيد إلى بريدك؛ أكّده ثم سجّل الدخول مجدداً.');
        } catch (upgradeError) {
          if (upgradeError instanceof Error && upgradeError.message.includes('تم ربط حسابك السابق')) {
            throw upgradeError;
          }
          await firebaseSignOut(firebaseAuth).catch(() => undefined);
          if ((upgradeError as { code?: string })?.code === 'auth/email-already-in-use') {
            throw new Error('كلمة المرور غير صحيحة.');
          }
          throw new Error('لم نعثر على حساب سابق بهذا البريد. إذا كنت مستخدماً جديداً، اختر «حساب جديد».');
        }
      }

      await credential.user.reload();
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await firebaseSignOut(firebaseAuth);
        throw new Error('بريدك غير مؤكّد. أرسلنا رابط تأكيد جديد؛ افتحه ثم سجّل الدخول.');
      }

      const idToken = await credential.user.getIdToken(true);
      const data = await apiClient.firebaseSession(idToken);
      setUser(data.user);
      setSettings(data.user.settings);
      applyThemeClass(data.user.settings.theme);
      await offlineDb.saveLocalSettings(data.user.settings);
      showNotice('success', `أهلاً بعودتك يا ${data.user.profile.displayName}`);
    },
    [applyThemeClass, showNotice]
  );

  const register = useCallback(
    async (payload: {
      displayName: string;
      username: string;
      email: string;
      password: string;
      migrateGuestProgress: boolean;
    }) => {
      let credential: UserCredential;
      try {
        credential = await createUserWithEmailAndPassword(firebaseAuth, payload.email.trim(), payload.password);
      } catch (error) {
        if ((error as { code?: string })?.code !== 'auth/email-already-in-use') throw error;
        credential = await signInWithEmailAndPassword(firebaseAuth, payload.email.trim(), payload.password);
      }

      if (credential.user.displayName !== payload.displayName) {
        await updateFirebaseProfile(credential.user, { displayName: payload.displayName });
      }
      await credential.user.reload();
      if (!credential.user.emailVerified) await sendEmailVerification(credential.user);

      const idToken = await credential.user.getIdToken(true);
      const data = await apiClient.firebaseRegister({
        idToken,
        displayName: payload.displayName,
        username: payload.username,
        timezone: getUserTimezone(),
        guestMigration: payload.migrateGuestProgress && guest.stats.gamesPlayed > 0 ? guest : undefined,
      });
      await firebaseSignOut(firebaseAuth);
      showNotice('success', data.message);
    },
    [guest, showNotice]
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      setAccessToken(null);
    }
    await firebaseSignOut(firebaseAuth).catch(() => undefined);
    setUser(null);
    showNotice('info', 'تم تسجيل الخروج. يمكنك الاستمرار في اللعب كزائر.');
    setScreen('home');
  }, [showNotice]);

  const refreshUserFromServer = useCallback(
    (updated: AuthSessionUser) => {
      setUser(updated);
      setSettings(updated.settings);
      applyThemeClass(updated.settings.theme);
    },
    [applyThemeClass]
  );

  const downloadOfflinePack = useCallback(async () => {
    const pack = await apiClient.downloadOfflinePack();
    setOfflinePack(pack);
    await offlineDb.saveOfflinePack(pack);
    showNotice('success', `تم تحميل ${pack.poems.length} قصيدة وحزم التحدي للعب دون اتصال.`);
  }, [showNotice]);

  const activeStats = user ? user.stats : guest.stats;
  const activeDisplayName = user ? user.profile.displayName : guest.displayName;
  const activeAvatarId = user ? user.profile.avatarId : guest.avatarId;

  return (
    <AppContext.Provider
      value={{
        appName,
        screen,
        navigate,
        user,
        guest,
        activeStats,
        activeDisplayName,
        activeAvatarId,
        settings,
        isOnline,
        backendAvailable,
        backendChecked,
        recheckBackend,
        isAuthReady,
        offlinePack,
        pendingSyncCount,
        dailyCompleted,
        activeGame,
        lastResult,
        bannerNotice,
        clearNotice,
        showNotice,
        setTheme,
        updateSettings,
        startChallenge,
        submitCurrentAnswer,
        advanceNextQuestion,
        abandonChallenge,
        login,
        register,
        logout,
        refreshUserFromServer,
        downloadOfflinePack,
        syncOfflineQueue,
        refreshDailyStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
