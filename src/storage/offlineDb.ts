import type {
  ChallengeHistoryItem,
  GameMode,
  GuestProgressSnapshot,
  OfflinePackPayload,
  PendingSyncSession,
  PlayerSettings,
} from '../../packages/shared/src/index.ts';
import { calculateLevelFromXp } from '../../packages/shared/src/constants.ts';

const DB_NAME = 'qafiyah_offline_db';
const DB_VERSION = 1;

const STORES = {
  KV: 'kv_store',
  SYNC_QUEUE: 'sync_queue',
} as const;

const KEYS = {
  OFFLINE_PACK: 'offline_pack_v1',
  GUEST_PROGRESS: 'guest_progress_v1',
  LOCAL_SETTINGS: 'local_settings_v1',
} as const;

const memoryFallback = new Map<string, unknown>();

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.KV)) {
        db.createObjectStore(STORES.KV);
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'operationId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIdb();
  if (!db) return (memoryFallback.get(key) as T | undefined) ?? null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.KV, 'readonly');
    const req = tx.objectStore(STORES.KV).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  memoryFallback.set(key, value);
  const db = await openIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORES.KV, 'readwrite');
    tx.objectStore(STORES.KV).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export function createDefaultGuestProgress(): GuestProgressSnapshot {
  return {
    guestId: crypto.randomUUID ? crypto.randomUUID() : `guest_${Date.now()}`,
    displayName: 'قارئ زائر',
    avatarId: 'scholar_astrolabe',
    stats: {
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastPlayedDate: null,
      gamesPlayed: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      dailyChallengesCompleted: 0,
    },
    history: [],
    unlockedAchievementCodes: [],
    dailyCompletedDates: [],
  };
}

export function createDefaultSettings(): PlayerSettings {
  return {
    theme: 'light',
    soundEnabled: true,
    vibrationEnabled: true,
    showOnLeaderboard: true,
    shareActivityPublicly: true,
  };
}

export const offlineDb = {
  async getOfflinePack(): Promise<OfflinePackPayload | null> {
    return idbGet<OfflinePackPayload>(KEYS.OFFLINE_PACK);
  },

  async saveOfflinePack(pack: OfflinePackPayload): Promise<void> {
    await idbSet(KEYS.OFFLINE_PACK, pack);
  },

  async getGuestProgress(): Promise<GuestProgressSnapshot> {
    const existing = await idbGet<GuestProgressSnapshot>(KEYS.GUEST_PROGRESS);
    if (existing) return existing;
    const fresh = createDefaultGuestProgress();
    await idbSet(KEYS.GUEST_PROGRESS, fresh);
    return fresh;
  },

  async saveGuestProgress(snapshot: GuestProgressSnapshot): Promise<void> {
    await idbSet(KEYS.GUEST_PROGRESS, snapshot);
  },

  async recordGuestSession(params: {
    mode: GameMode;
    totalQuestions: number;
    correctCount: number;
    xpEarned: number;
    durationSeconds: number;
    todayDate: string;
  }): Promise<GuestProgressSnapshot> {
    const current = await this.getGuestProgress();
    const nextXp = current.stats.totalXp + params.xpEarned;
    const prevDate = current.stats.lastPlayedDate;

    let nextStreak = current.stats.currentStreak;
    if (!prevDate) {
      nextStreak = 1;
    } else if (prevDate !== params.todayDate) {
      const yesterday = new Date(Date.parse(params.todayDate) - 86400000).toISOString().slice(0, 10);
      nextStreak = prevDate === yesterday ? current.stats.currentStreak + 1 : 1;
    }

    const historyItem: ChallengeHistoryItem = {
      sessionId: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
      mode: params.mode,
      totalQuestions: params.totalQuestions,
      correctCount: params.correctCount,
      accuracy:
        params.totalQuestions > 0
          ? Math.round((params.correctCount / params.totalQuestions) * 100)
          : 0,
      xpEarned: params.xpEarned,
      durationSeconds: params.durationSeconds,
      completedAt: new Date().toISOString(),
    };

    const nextUnlocked = new Set(current.unlockedAchievementCodes);
    nextUnlocked.add('first_round');
    if (params.correctCount === params.totalQuestions && params.totalQuestions > 0) {
      nextUnlocked.add('perfect_round');
    }
    if (params.mode === 'daily_challenge') {
      nextUnlocked.add('daily_champion');
    }

    const dailyDates =
      params.mode === 'daily_challenge' && !current.dailyCompletedDates.includes(params.todayDate)
        ? [...current.dailyCompletedDates, params.todayDate]
        : current.dailyCompletedDates;

    const updated: GuestProgressSnapshot = {
      ...current,
      stats: {
        totalXp: nextXp,
        level: calculateLevelFromXp(nextXp),
        currentStreak: nextStreak,
        longestStreak: Math.max(current.stats.longestStreak, nextStreak),
        lastPlayedDate: params.todayDate,
        gamesPlayed: current.stats.gamesPlayed + 1,
        totalQuestions: current.stats.totalQuestions + params.totalQuestions,
        correctAnswers: current.stats.correctAnswers + params.correctCount,
        dailyChallengesCompleted:
          current.stats.dailyChallengesCompleted + (params.mode === 'daily_challenge' ? 1 : 0),
      },
      history: [historyItem, ...current.history].slice(0, 50),
      unlockedAchievementCodes: Array.from(nextUnlocked),
      dailyCompletedDates: dailyDates,
    };

    await this.saveGuestProgress(updated);
    return updated;
  },

  async resetGuestProgress(): Promise<GuestProgressSnapshot> {
    const fresh = createDefaultGuestProgress();
    await idbSet(KEYS.GUEST_PROGRESS, fresh);
    return fresh;
  },

  async getLocalSettings(): Promise<PlayerSettings> {
    const saved = await idbGet<PlayerSettings>(KEYS.LOCAL_SETTINGS);
    return saved ?? createDefaultSettings();
  },

  async saveLocalSettings(settings: PlayerSettings): Promise<void> {
    await idbSet(KEYS.LOCAL_SETTINGS, settings);
  },

  async enqueueSyncSession(session: PendingSyncSession): Promise<void> {
    const db = await openIdb();
    if (!db) {
      const list = (memoryFallback.get('sync_queue') as PendingSyncSession[] | undefined) ?? [];
      list.push(session);
      memoryFallback.set('sync_queue', list);
      return;
    }
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      tx.objectStore(STORES.SYNC_QUEUE).put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },

  async getPendingSyncSessions(): Promise<PendingSyncSession[]> {
    const db = await openIdb();
    if (!db) {
      return (memoryFallback.get('sync_queue') as PendingSyncSession[] | undefined) ?? [];
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const req = tx.objectStore(STORES.SYNC_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as PendingSyncSession[] | undefined) ?? []);
      req.onerror = () => resolve([]);
    });
  },

  async removePendingSyncSessions(operationIds: string[]): Promise<void> {
    if (operationIds.length === 0) return;
    const db = await openIdb();
    if (!db) {
      const list = (memoryFallback.get('sync_queue') as PendingSyncSession[] | undefined) ?? [];
      memoryFallback.set(
        'sync_queue',
        list.filter((s) => !operationIds.includes(s.operationId))
      );
      return;
    }
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      for (const id of operationIds) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },
};
