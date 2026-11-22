import React from 'react';
import {
  Award,
  BookOpen,
  Compass,
  Home,
  Settings,
  Swords,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp, type ScreenId } from '../context/AppContext.tsx';
import { getAvatarImageUrl } from '../utils/feedback.ts';
import { getOptimizedImageUrl } from '../services/profilePhoto.ts';

interface LayoutShellProps {
  children: React.ReactNode;
  onOpenAuthModal: () => void;
}

const NAV_ITEMS: Array<{ id: ScreenId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'modes', label: 'التحديات', icon: Swords },
  { id: 'library', label: 'المكتبة', icon: BookOpen },
  { id: 'leaderboards', label: 'المتصدرون', icon: Award },
  { id: 'profile', label: 'حسابي', icon: User },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({ children, onOpenAuthModal }) => {
  const {
    appName,
    screen,
    navigate,
    user,
    activeDisplayName,
    activeAvatarId,
    isOnline,
    backendAvailable,
    backendChecked,
    recheckBackend,
    bannerNotice,
    clearNotice,
    pendingSyncCount,
  } = useApp();

  const isPlaying = screen === 'play';

  return (
    <div className="min-h-dvh flex flex-col bg-[#F7F3E8] dark:bg-[#102448] text-[#17233A] dark:text-[#F7F3E8] transition-colors">
      {!isPlaying && (
        <header className="sticky top-0 z-30 h-14 md:h-16 bg-[#F7F3E8]/90 dark:bg-[#102448]/90 backdrop-blur-md border-b border-[#E8DEC8] dark:border-[#2B4164]">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
            {/* Zone 1: Single text element wordmark */}
            <button
              type="button"
              onClick={() => navigate('home')}
              className="text-xl font-bold font-poetry tracking-tight text-[#14284B] dark:text-[#E0B84F] whitespace-nowrap shrink-0 min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#14284B]"
            >
              {appName}
            </button>

            {/* Zone 2: Clean single-line text navigation links */}
            <nav aria-label="التنقل الرئيسي" className="hidden md:flex items-center gap-6 text-sm font-medium">
              {NAV_ITEMS.map((item) => {
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`whitespace-nowrap shrink-0 py-2 border-b-2 transition-colors min-h-[44px] ${
                      active
                        ? 'border-[#14284B] dark:border-[#E0B84F] text-[#17233A] dark:text-[#F7F3E8] font-semibold'
                        : 'border-transparent text-[#626777] dark:text-[#C5CDDB] hover:text-[#17233A] dark:hover:text-[#F7F3E8]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => navigate('settings')}
                className={`whitespace-nowrap shrink-0 py-2 border-b-2 transition-colors min-h-[44px] ${
                  screen === 'settings'
                    ? 'border-[#14284B] dark:border-[#E0B84F] text-[#17233A] dark:text-[#F7F3E8] font-semibold'
                    : 'border-transparent text-[#626777] dark:text-[#C5CDDB] hover:text-[#17233A] dark:hover:text-[#F7F3E8]'
                }`}
              >
                الإعدادات
              </button>
            </nav>

            {/* Zone 3: Single primary action */}
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] hover:border-[#14284B] dark:hover:border-[#E0B84F] transition-colors min-h-[44px] whitespace-nowrap shrink-0"
                >
                  <img
                    src={getOptimizedImageUrl(user?.profile.avatarUrl || getAvatarImageUrl(activeAvatarId), 96)}
                    alt={activeDisplayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-cover shrink-0" loading="eager" decoding="async" />
                  <span className="text-sm font-medium max-w-[110px] truncate">{activeDisplayName}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 rounded-xl bg-[#14284B] hover:bg-[#0D1D39] dark:bg-[#E0B84F] dark:hover:bg-[#C69B2F] text-white dark:text-[#102448] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Backend-unconfigured / Offline Contextual Strip (non-sticky) */}
      {((backendChecked && !backendAvailable) || !isOnline || pendingSyncCount > 0) && !isPlaying && (
        <div className="bg-[#EEE6D4] dark:bg-[#172D50] border-b border-[#E8DEC8] dark:border-[#2B4164] px-4 py-2 text-xs text-[#626777] dark:text-[#C5CDDB]">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isOnline ? <WifiOff className="w-4 h-4 shrink-0" /> : <Compass className="w-4 h-4 shrink-0" />}
              <span>
                {!isOnline
                  ? 'وضع عدم الاتصال نشط — يمكنك اللعب من الحزمة المحفوظة وستُحفظ نتائجك للمزامنة.'
                  : !backendAvailable
                    ? 'وضع معاينة الواجهة فقط: الخادم الخلفي وقاعدة البيانات غير متصلين بعد. تعمل إعدادات المظهر والملف المحلي بشكل كامل.'
                    : `توجد ${pendingSyncCount} جولات بانتظار المزامنة عند تسجيل الدخول.`}
              </span>
            </div>
            {isOnline && !backendAvailable && (
              <button
                type="button"
                onClick={() => void recheckBackend()}
                className="font-semibold text-[#14284B] dark:text-[#E0B84F] hover:underline whitespace-nowrap"
              >
                إعادة الفحص
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transient User Feedback Banner */}
      {bannerNotice && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="status"
            className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm ${
              bannerNotice.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                : bannerNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                  : 'bg-[#EEE6D4] dark:bg-[#172D50] border-[#E8DEC8] dark:border-[#2B4164] text-[#17233A] dark:text-[#F7F3E8]'
            }`}
          >
            <span>{bannerNotice.message}</span>
            <button
              type="button"
              onClick={clearNotice}
              aria-label="إغلاق التنبيه"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 ${!isPlaying ? 'pb-20 md:pb-12' : ''}`}>{children}</main>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      {!isPlaying && (
        <nav
          aria-label="التنقل السفلي"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#F7F3E8]/95 dark:bg-[#102448]/95 backdrop-blur-md border-t border-[#E8DEC8] dark:border-[#2B4164] pb-safe"
        >
          <div className="grid grid-cols-5 h-16">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                    active
                      ? 'text-[#14284B] dark:text-[#E0B84F] font-semibold'
                      : 'text-[#626777] dark:text-[#C5CDDB]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] leading-none whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};
