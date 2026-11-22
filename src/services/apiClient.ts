import type {
  Achievement,
  ApiResponse,
  AuthSessionUser,
  ChallengeHistoryItem,
  ChallengeQuestion,
  Era,
  GameMode,
  GuestProgressSnapshot,
  LeaderboardEntry,
  LeaderboardPeriod,
  Meter,
  OfflinePackPayload,
  PendingSyncSession,
  PlayerSettings,
  PoemDetail,
  PoemSummary,
  PoemType,
  Poet,
  QuestionFeedback,
  Rhyme,
  SessionResult,
  Theme,
} from '../../packages/shared/src/index.ts';
import {
  EmailAuthProvider,
  firebaseAuth,
  reauthenticateWithCredential,
  updatePassword,
} from './firebase.ts';

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://midhmar-alqawafi.onrender.com').replace(/\/$/, '');

// Access token lives strictly in memory (never localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const BACKEND_UNAVAILABLE_MESSAGE =
  'الخادم الخلفي غير متصل حالياً. يعمل التطبيق الآن في وضع تطوير الواجهة دون اتصال بقاعدة البيانات.';

async function safeParseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!response.ok) {
        inMemoryAccessToken = null;
        return null;
      }
      const json = await safeParseJson<
        ApiResponse<{
          accessToken: string;
          user: AuthSessionUser;
        }>
      >(response);
      if (json && json.success) {
        inMemoryAccessToken = json.data.accessToken;
        return json.data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnAuth = true
): Promise<{ data: T; meta?: { page?: number; limit?: number; total?: number; totalPages?: number } }> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiClientError('BACKEND_UNAVAILABLE', BACKEND_UNAVAILABLE_MESSAGE, 503);
  }

  if (response.status === 401 && retryOnAuth && !path.startsWith('/api/auth/')) {
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
  }

  const json = await safeParseJson<ApiResponse<T>>(response);
  if (!json) {
    throw new ApiClientError('BACKEND_UNAVAILABLE', BACKEND_UNAVAILABLE_MESSAGE, 503);
  }
  if (json.success === false) {
    throw new ApiClientError(json.error.code, json.error.message, response.status);
  }

  return { data: json.data, meta: json.meta };
}

export const apiClient = {
  async firebaseRegister(payload: {
    idToken: string;
    displayName?: string;
    username?: string;
    timezone?: string;
    guestMigration?: GuestProgressSnapshot;
  }) {
    const body = {
      ...payload,
      guestMigration: payload.guestMigration
        ? {
            guestId: payload.guestMigration.guestId,
            stats: payload.guestMigration.stats,
            history: payload.guestMigration.history,
          }
        : undefined,
    };
    const res = await request<{ message: string }>('/api/auth/firebase/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data;
  },

  async firebaseSession(idToken: string) {
    const res = await request<{ accessToken: string; user: AuthSessionUser }>('/api/auth/firebase/session', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    inMemoryAccessToken = res.data.accessToken;
    return res.data;
  },

  async checkBackendHealth(): Promise<{
    available: boolean;
    databaseConfigured: boolean;
    authConfigured: boolean;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return { available: false, databaseConfigured: false, authConfigured: false };
      }
      const json = await safeParseJson<
        ApiResponse<{
          status: string;
          databaseConfigured?: boolean;
          authConfigured?: boolean;
        }>
      >(response);
      if (!json || !json.success || json.data.status !== 'ok') {
        return { available: false, databaseConfigured: false, authConfigured: false };
      }
      return {
        available: true,
        databaseConfigured: Boolean(json.data.databaseConfigured),
        authConfigured: Boolean(json.data.authConfigured),
      };
    } catch {
      return { available: false, databaseConfigured: false, authConfigured: false };
    } finally {
      clearTimeout(timer);
    }
  },

  async refreshSession(): Promise<{ accessToken: string; user: AuthSessionUser } | null> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!response.ok) return null;
      const json = await safeParseJson<
        ApiResponse<{
          accessToken: string;
          user: AuthSessionUser;
        }>
      >(response);
      if (json && json.success) {
        inMemoryAccessToken = json.data.accessToken;
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async register(payload: {
    displayName: string;
    username: string;
    email: string;
    password: string;
    timezone?: string;
    guestMigration?: GuestProgressSnapshot;
  }) {
    const body = {
      ...payload,
      guestMigration: payload.guestMigration
        ? {
            guestId: payload.guestMigration.guestId,
            stats: payload.guestMigration.stats,
            history: payload.guestMigration.history,
          }
        : undefined,
    };
    const res = await request<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data;
  },

  async login(payload: { email: string; password: string }) {
    const res = await request<{ accessToken: string; user: AuthSessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    inMemoryAccessToken = res.data.accessToken;
    return res.data;
  },

  async logout() {
    await request<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });
    inMemoryAccessToken = null;
  },

  async resendVerification(email: string) {
    const res = await request<{ message: string }>('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
    return res.data;
  },

  async forgotPassword(email: string) {
    const res = await request<{ message: string }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return res.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const res = await request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const user = firebaseAuth.currentUser;
    if (!user || !user.email) throw new ApiClientError('UNAUTHORIZED', 'يرجى تسجيل الدخول مجدداً', 401);
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { message: 'تم تغيير كلمة المرور بنجاح' };
  },

  async deleteAccount() {
    const res = await request<{ deleted: boolean }>('/api/auth/account', {
      method: 'DELETE',
    });
    inMemoryAccessToken = null;
    return res.data;
  },

  async updateProfile(payload: {
    displayName?: string;
    username?: string;
    avatarId?: string;
    avatarUrl?: string | null;
    bio?: string;
    timezone?: string;
  }) {
    const res = await request<AuthSessionUser>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateSettings(payload: Partial<PlayerSettings>) {
    const res = await request<PlayerSettings>('/api/profile/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getAchievements() {
    const res = await request<Achievement[]>('/api/profile/achievements');
    return res.data;
  },

  async getHistory() {
    const res = await request<ChallengeHistoryItem[]>('/api/profile/history');
    return res.data;
  },

  async getDailyStatus(timezone: string) {
    const res = await request<{
      challengeDate: string;
      alreadyCompleted: boolean;
      completedSession: {
        sessionId: string;
        correctCount: number;
        totalQuestions: number;
        xpEarned: number;
      } | null;
    }>(`/api/game/daily/status?timezone=${encodeURIComponent(timezone)}`);
    return res.data;
  },

  async startGameSession(payload: {
    mode: GameMode;
    eraId?: number;
    questionCount?: number;
    timezone?: string;
  }) {
    const res = await request<{
      sessionId: string;
      mode: GameMode;
      challengeDate: string | null;
      questions: ChallengeQuestion[];
    }>('/api/game/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async submitAnswer(
    sessionId: string,
    payload: { questionId: string; selectedOptionId: string; responseTimeMs: number }
  ) {
    const res = await request<QuestionFeedback>(`/api/game/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async completeSession(sessionId: string, payload: { durationSeconds: number; timezone?: string }) {
    const res = await request<SessionResult>(`/api/game/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getLeaderboards(period: LeaderboardPeriod) {
    const res = await request<{
      period: LeaderboardPeriod;
      entries: LeaderboardEntry[];
      currentUserRank: number | null;
    }>(`/api/leaderboards?period=${period}`);
    return res.data;
  },

  async getTaxonomy() {
    const res = await request<{
      eras: Era[];
      meters: Meter[];
      themes: Theme[];
      rhymes: Rhyme[];
      poemTypes: PoemType[];
    }>('/api/poetry/taxonomy');
    return res.data;
  },

  async getPoets(params: { eraId?: number; q?: string } = {}) {
    const search = new URLSearchParams();
    if (params.eraId) search.set('eraId', String(params.eraId));
    if (params.q) search.set('q', params.q);
    const res = await request<Poet[]>(`/api/poetry/poets?${search.toString()}`);
    return res.data;
  },

  async getPoetDetail(poetId: number) {
    const res = await request<{
      poet: Poet;
      poems: Array<{
        id: number;
        titleAr: string;
        verseCount: number;
        meterNameAr: string | null;
        themeNameAr: string | null;
      }>;
    }>(`/api/poetry/poets/${poetId}`);
    return res.data;
  },

  async getPoems(
    params: {
      page?: number;
      limit?: number;
      eraId?: number;
      meterId?: number;
      themeId?: number;
      poetId?: number;
      q?: string;
    } = {}
  ) {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.eraId) search.set('eraId', String(params.eraId));
    if (params.meterId) search.set('meterId', String(params.meterId));
    if (params.themeId) search.set('themeId', String(params.themeId));
    if (params.poetId) search.set('poetId', String(params.poetId));
    if (params.q) search.set('q', params.q);
    const res = await request<PoemSummary[]>(`/api/poetry/poems?${search.toString()}`);
    return res;
  },

  async getPoemDetail(poemId: number) {
    const res = await request<PoemDetail>(`/api/poetry/poems/${poemId}`);
    return res.data;
  },

  async downloadOfflinePack() {
    const res = await request<OfflinePackPayload>('/api/sync/pack');
    return res.data;
  },

  async syncPendingSessions(sessions: PendingSyncSession[], timezone: string) {
    const res = await request<{
      syncedOperationIds: string[];
      skippedOperationIds: string[];
      user: AuthSessionUser | null;
    }>('/api/sync/sessions', {
      method: 'POST',
      body: JSON.stringify({ sessions, timezone }),
    });
    return res.data;
  },
};
