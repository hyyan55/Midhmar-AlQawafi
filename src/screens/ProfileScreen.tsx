import React, { useEffect, useState } from 'react';
import { Award, Check, Edit3, Flame, History, Trophy } from 'lucide-react';
import {
  AVATAR_OPTIONS,
  GAME_MODES_META,
  getLevelBounds,
  getLevelProgressPercent,
  getRankTitleAr,
  type Achievement,
  type ChallengeHistoryItem,
} from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';
import { uploadProfilePhoto } from '../services/profilePhoto.ts';
import { offlineDb } from '../storage/offlineDb.ts';
import { formatDurationAr, getAvatarImageUrl } from '../utils/feedback.ts';

interface ProfileScreenProps {
  onOpenAuthModal: () => void;
}

const DEFAULT_GUEST_ACHIEVEMENTS: Array<{
  code: string;
  titleAr: string;
  descriptionAr: string;
  category: string;
  xpBonus: number;
}> = [
  { code: 'first_round', titleAr: 'فاتحة الديوان', descriptionAr: 'أكمل أول جولة تحدٍّ.', category: 'بدايات', xpBonus: 30 },
  { code: 'perfect_round', titleAr: 'إصابة المحزّ', descriptionAr: 'أجب عن جولة كاملة بنسبة ١٠٠٪.', category: 'دقة', xpBonus: 60 },
  { code: 'daily_champion', titleAr: 'فارس التحدي اليومي', descriptionAr: 'أكمل التحدي اليومي للمرة الأولى.', category: 'تحديات', xpBonus: 45 },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenAuthModal }) => {
  const {
    user,
    guest,
    activeStats,
    activeDisplayName,
    activeAvatarId,
    isOnline,
    backendAvailable,
    refreshUserFromServer,
    showNotice,
    navigate,
  } = useApp();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(activeDisplayName);
  const [editUsername, setEditUsername] = useState(user?.profile.username || '');
  const [editBio, setEditBio] = useState(user?.profile.bio || '');
  const [editAvatar, setEditAvatar] = useState(activeAvatarId);
  const [saving, setSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    setEditName(activeDisplayName);
    setEditUsername(user?.profile.username || '');
    setEditBio(user?.profile.bio || '');
    setEditAvatar(activeAvatarId);
  }, [activeAvatarId, activeDisplayName, user]);

  useEffect(() => {
    let active = true;
    if (user && isOnline && backendAvailable) {
      Promise.all([apiClient.getAchievements(), apiClient.getHistory()])
        .then(([ach, hist]) => {
          if (!active) return;
          setAchievements(ach);
          setHistory(hist);
        })
        .catch(() => {
          // ignore
        });
    } else {
      setHistory(guest.history);
      setAchievements(
        DEFAULT_GUEST_ACHIEVEMENTS.map((a, idx) => ({
          id: idx + 1,
          ...a,
          unlocked: guest.unlockedAchievementCodes.includes(a.code),
          unlockedAt: null,
        }))
      );
    }
    return () => {
      active = false;
    };
  }, [backendAvailable, guest.history, guest.unlockedAchievementCodes, isOnline, user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (user) {
        const updated = await apiClient.updateProfile({
          displayName: editName,
          username: editUsername,
          bio: editBio,
          avatarId: editAvatar,
          ...(selectedPhoto ? { avatarUrl: await uploadProfilePhoto(selectedPhoto) } : {}),
        });
        refreshUserFromServer(updated);
        showNotice('success', 'تم تحديث بيانات الملف الشخصي.');
      } else {
        await offlineDb.saveGuestProgress({
          ...guest,
          displayName: editName.trim() || 'قارئ زائر',
          avatarId: editAvatar,
        });
        showNotice('success', 'تم حفظ بيانات الزائر محلياً.');
      }
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setEditing(false);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'تعذر حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  }

  const accuracy =
    activeStats.totalQuestions > 0
      ? Math.round((activeStats.correctAnswers / activeStats.totalQuestions) * 100)
      : 0;
  const levelProgress = getLevelProgressPercent(activeStats.totalXp);
  const { nextLevelXp } = getLevelBounds(activeStats.level);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* Header Profile Card */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={user?.profile.avatarUrl || getAvatarImageUrl(activeAvatarId)}
              alt={activeDisplayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-2xl object-cover border border-[#DFD9CE] dark:border-[#2A3542] shrink-0"
            />
            <div className="space-y-1.5">
              <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
                {user ? `@${user.profile.username}` : 'حساب زائر محلي'} · {getRankTitleAr(activeStats.level)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-poetry">{activeDisplayName}</h1>
              {user?.profile.bio && (
                <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0] max-w-xl">{user.profile.bio}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-[#EFECE4] hover:bg-[#E5E0D5] dark:bg-[#1E2732] dark:hover:bg-[#273240] text-sm font-medium flex items-center gap-2 min-h-[44px]"
            >
              <Edit3 className="w-4 h-4" />
              <span>{editing ? 'إلغاء التعديل' : 'تعديل الملف'}</span>
            </button>
            {!user && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-4 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold min-h-[44px]"
              >
                ترحيل التقدم لحساب دائم
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="px-4 py-2.5 rounded-xl border border-[#DFD9CE] dark:border-[#2A3542] text-sm font-medium min-h-[44px]"
            >
              الإعدادات
            </button>
          </div>
        </div>

        {/* Edit Profile Inline Form */}
        {editing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-[#DFD9CE] dark:border-[#2A3542] space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">الاسم الظاهر</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] dark:bg-[#0F1419] border border-[#DFD9CE] dark:border-[#2A3542] text-sm"
                />
              </div>
              {user && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">اسم المستخدم</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] dark:bg-[#0F1419] border border-[#DFD9CE] dark:border-[#2A3542] text-sm text-left"
                  />
                </div>
              )}
            </div>

            {user && (
              <div>
                <label className="block text-sm font-medium mb-1.5">نبذة أدبية</label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="شغوف بشعر الحكمة والمعلقات..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] dark:bg-[#0F1419] border border-[#DFD9CE] dark:border-[#2A3542] text-sm"
                />
              </div>
            )}

            {user && (
              <div>
                <label className="block text-sm font-medium mb-2">الصورة الشخصية</label>
                <div className="flex items-center gap-4">
                  <img src={photoPreview || user.profile.avatarUrl || getAvatarImageUrl(activeAvatarId)} alt="معاينة الصورة الشخصية" className="w-16 h-16 rounded-full object-cover border border-[#DFD9CE] dark:border-[#2A3542]" />
                  <div className="space-y-2 min-w-0">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setSelectedPhoto(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }} className="block w-full text-xs file:ml-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#EFECE4] dark:file:bg-[#1E2732]" />
                    <p className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">JPG أو PNG أو WebP، بحد أقصى 8 ميجابايت. تُضغط الصورة تلقائياً قبل الرفع.</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">الشارة الرمزية</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEditAvatar(opt.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 text-right transition-colors ${
                      editAvatar === opt.id
                        ? 'border-[#0D6E52] dark:border-[#18A87E] bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-[#DFD9CE] dark:border-[#2A3542]'
                    }`}
                  >
                    <img
                      src={getAvatarImageUrl(opt.id)}
                      alt={opt.labelAr}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-xs font-medium">{opt.labelAr}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold flex items-center gap-2 min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
          </form>
        )}

        {/* XP Bar */}
        <div className="mt-6 pt-6 border-t border-[#DFD9CE] dark:border-[#2A3542] space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold">
              المستوى <span className="font-mono-tabular">{activeStats.level}</span>
            </span>
            <span className="font-mono-tabular text-[#5E615E] dark:text-[#A0A8B0]">
              {activeStats.totalXp} / {nextLevelXp} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EFECE4] dark:bg-[#0F1419] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0D6E52] dark:bg-[#18A87E]"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-5">
          <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
            <span>مجموع الخبرة</span>
            <Trophy className="w-4 h-4 text-[#B47B1B] dark:text-[#E5A93C]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular mt-2">{activeStats.totalXp}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-5">
          <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
            <span>السلسلة الحالية</span>
            <Flame className="w-4 h-4 text-[#B47B1B] dark:text-[#E5A93C]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular mt-2">{activeStats.currentStreak} أيام</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-5">
          <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
            <span>دقة الإجابات</span>
            <Award className="w-4 h-4 text-[#0D6E52] dark:text-[#18A87E]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular mt-2">{accuracy}%</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-5">
          <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
            <span>التحديات اليومية</span>
            <History className="w-4 h-4 text-[#0D6E52] dark:text-[#18A87E]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular mt-2">
            {activeStats.dailyChallengesCompleted}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold font-poetry">الأوسمة والإنجازات</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.code}
              className={`rounded-2xl border p-5 space-y-2 ${
                ach.unlocked
                  ? 'bg-white dark:bg-[#171E26] border-[#0D6E52]/50 dark:border-[#18A87E]/50'
                  : 'bg-[#EFECE4]/50 dark:bg-[#171E26]/40 border-[#DFD9CE] dark:border-[#2A3542] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
                <span>{ach.category}</span>
                <span className="font-mono-tabular">+{ach.xpBonus} XP</span>
              </div>
              <h3 className="font-bold text-base">{ach.titleAr}</h3>
              <p className="text-xs text-[#5E615E] dark:text-[#A0A8B0] leading-relaxed">
                {ach.descriptionAr}
              </p>
              <div className="text-xs font-semibold pt-1">
                {ach.unlocked ? (
                  <span className="text-[#0D6E52] dark:text-[#18A87E]">مفتوح</span>
                ) : (
                  <span className="text-[#5E615E] dark:text-[#A0A8B0]">قيد الإنجاز</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Challenge History */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold font-poetry">سجل التحديات</h2>
        {history.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-8 text-center text-sm text-[#5E615E] dark:text-[#A0A8B0]">
            لا توجد جولات مسجلة بعد.
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] divide-y divide-[#DFD9CE] dark:divide-[#2A3542]">
            {history.map((item) => (
              <div
                key={item.sessionId}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-sm">{GAME_MODES_META[item.mode].titleAr}</div>
                  <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
                    <span className="font-mono-tabular">
                      {item.correctCount}/{item.totalQuestions}
                    </span>{' '}
                    · دقة <span className="font-mono-tabular">{item.accuracy}%</span> ·{' '}
                    <span className="font-mono-tabular">{formatDurationAr(item.durationSeconds)}</span>
                  </div>
                </div>
                <div className="font-mono-tabular text-sm font-bold text-[#0D6E52] dark:text-[#18A87E]">
                  +{item.xpEarned} XP
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
