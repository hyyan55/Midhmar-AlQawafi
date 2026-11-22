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
    <div className="min-h-dvh flex flex-col bg-[#F8F6F1] dark:bg-[#0F1419] text-[#181A1B] dark:text-[#F3EFE6] transition-colors">
      {!isPlaying && (
        <header className="sticky top-0 z-30 h-14 md:h-16 bg-[#F8F6F1]/90 dark:bg-[#0F1419]/90 backdrop-blur-md border-b border-[#DFD9CE] dark:border-[#2A3542]">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
            {/* Zone 1: Single text element wordmark */}
            <button
              type="button"
              onClick={() => navigate('home')}
              className="text-xl font-bold font-poetry tracking-tight text-[#0D6E52] dark:text-[#18A87E] whitespace-nowrap shrink-0 min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#0D6E52]"
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
                        ? 'border-[#0D6E52] dark:border-[#18A87E] text-[#181A1B] dark:text-[#F3EFE6] font-semibold'
                        : 'border-transparent text-[#5E615E] dark:text-[#A0A8B0] hover:text-[#181A1B] dark:hover:text-[#F3EFE6]'
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
                    ? 'border-[#0D6E52] dark:border-[#18A87E] text-[#181A1B] dark:text-[#F3EFE6] font-semibold'
                    : 'border-transparent text-[#5E615E] dark:text-[#A0A8B0] hover:text-[#181A1B] dark:hover:text-[#F3EFE6]'
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
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] hover:border-[#0D6E52] dark:hover:border-[#18A87E] transition-colors min-h-[44px] whitespace-nowrap shrink-0"
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
                  className="px-4 py-2 rounded-xl bg-[#0D6E52] hover:bg-[#0A5740] dark:bg-[#18A87E] dark:hover:bg-[#14906B] text-white dark:text-[#0F1419] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
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
        <div className="bg-[#EFECE4] dark:bg-[#171E26] border-b border-[#DFD9CE] dark:border-[#2A3542] px-4 py-2 text-xs text-[#5E615E] dark:text-[#A0A8B0]">
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
                className="font-semibold text-[#0D6E52] dark:text-[#18A87E] hover:underline whitespace-nowrap"
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
                  : 'bg-[#EFECE4] dark:bg-[#171E26] border-[#DFD9CE] dark:border-[#2A3542] text-[#181A1B] dark:text-[#F3EFE6]'
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
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#F8F6F1]/95 dark:bg-[#0F1419]/95 backdrop-blur-md border-t border-[#DFD9CE] dark:border-[#2A3542] pb-safe"
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
                      ? 'text-[#0D6E52] dark:text-[#18A87E] font-semibold'
                      : 'text-[#5E615E] dark:text-[#A0A8B0]'
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
