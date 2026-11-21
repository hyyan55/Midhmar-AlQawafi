import React, { useState } from 'react';
import {
  Download,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';

interface SettingsScreenProps {
  onOpenAuthModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenAuthModal }) => {
  const {
    user,
    settings,
    setTheme,
    updateSettings,
    logout,
    offlinePack,
    downloadOfflinePack,
    pendingSyncCount,
    syncOfflineQueue,
    isOnline,
    backendAvailable,
    showNotice,
    navigate,
  } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordBusy(true);
    try {
      const res = await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showNotice('success', res.message);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'تعذر تغيير كلمة المرور');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleDownloadPack() {
    setDownloadingPack(true);
    try {
      await downloadOfflinePack();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'تعذر تحميل حزمة عدم الاتصال');
    } finally {
      setDownloadingPack(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiClient.deleteAccount();
      await logout();
      setConfirmDelete(false);
      navigate('home');
      showNotice('info', 'تم حذف الحساب نهائياً.');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'تعذر حذف الحساب');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-poetry">الإعدادات</h1>
        <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">
          خصّص المظهر، الأصوات، الخصوصية، وحزمة اللعب دون اتصال.
        </p>
      </div>

      {/* Theme */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 space-y-4">
        <h2 className="text-lg font-bold font-poetry">المظهر</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void setTheme('light')}
            className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold min-h-[48px] ${
              settings.theme === 'light'
                ? 'border-[#0D6E52] bg-emerald-50/60 dark:bg-emerald-950/30 text-[#0D6E52]'
                : 'border-[#DFD9CE] dark:border-[#2A3542]'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>الوضع النهاري</span>
          </button>
          <button
            type="button"
            onClick={() => void setTheme('dark')}
            className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold min-h-[48px] ${
              settings.theme === 'dark'
                ? 'border-[#18A87E] bg-emerald-950/30 text-[#18A87E]'
                : 'border-[#DFD9CE] dark:border-[#2A3542]'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>الوضع الليلي</span>
          </button>
        </div>
      </section>

      {/* Sound & Vibration */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-[#0D6E52] dark:text-[#18A87E]" />
          <h2 className="text-lg font-bold font-poetry">الصوت والاهتزاز</h2>
        </div>

        <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
          <div>
            <div className="text-sm font-medium">المؤثرات الصوتية</div>
            <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
              تشغيل نغمات خفيفة عند الإجابة وإتمام الجولات
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => void updateSettings({ soundEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#0D6E52]"
          />
        </label>

        <label className="flex items-center justify-between gap-4 py-2 border-t border-[#EFECE4] dark:border-[#2A3542] cursor-pointer">
          <div>
            <div className="text-sm font-medium">الاهتزاز اللمسي</div>
            <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
              تنبيه لمسي لطيف على الأجهزة المدعومة
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.vibrationEnabled}
            onChange={(e) => void updateSettings({ vibrationEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#0D6E52]"
          />
        </label>
      </section>

      {/* Privacy */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0D6E52] dark:text-[#18A87E]" />
          <h2 className="text-lg font-bold font-poetry">الخصوصية</h2>
        </div>

        <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
          <div>
            <div className="text-sm font-medium">الظهور في لوحة المتصدرين</div>
            <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
              عرض اسمك الظاهر وترتيبك بين القرّاء
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.showOnLeaderboard}
            onChange={(e) => void updateSettings({ showOnLeaderboard: e.target.checked })}
            className="w-5 h-5 accent-[#0D6E52]"
          />
        </label>

        <label className="flex items-center justify-between gap-4 py-2 border-t border-[#EFECE4] dark:border-[#2A3542] cursor-pointer">
          <div>
            <div className="text-sm font-medium">مشاركة النشاط العام</div>
            <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
              السماح بإظهار إنجازاتك في القوائم العامة
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.shareActivityPublicly}
            onChange={(e) => void updateSettings({ shareActivityPublicly: e.target.checked })}
            className="w-5 h-5 accent-[#0D6E52]"
          />
        </label>
      </section>

      {/* Offline Pack & Sync */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 space-y-4">
        <h2 className="text-lg font-bold font-poetry">التخزين المحلي واللعب دون اتصال</h2>
        <p className="text-xs text-[#5E615E] dark:text-[#A0A8B0] leading-relaxed">
          {offlinePack
            ? `المحفوظ محلياً: ${offlinePack.poems.length} قصيدة و${offlinePack.poets.length} شاعراً جاهزة للاستخدام دون إنترنت.`
            : !isOnline || !backendAvailable
              ? 'يمكنك تحميل حزمة القصائد للعب دون اتصال بمجرد تشغيل الخادم الخلفي وربط قاعدة البيانات.'
              : 'لم يتم تحميل حزمة القصائد والأسئلة دون اتصال بعد.'}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!isOnline || !backendAvailable || downloadingPack}
            onClick={() => void handleDownloadPack()}
            className="px-4 py-2.5 rounded-xl bg-[#EFECE4] hover:bg-[#E5E0D5] dark:bg-[#1E2732] dark:hover:bg-[#273240] text-sm font-medium flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingPack ? 'جارٍ التحديث...' : 'تحديث الحزمة المحلية'}</span>
          </button>

          {user && pendingSyncCount > 0 && (
            <button
              type="button"
              disabled={!isOnline || !backendAvailable}
              onClick={() => void syncOfflineQueue()}
              className="px-4 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>مزامنة ({pendingSyncCount})</span>
            </button>
          )}
        </div>
      </section>

      {/* Account Management */}
      <section className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#0D6E52] dark:text-[#18A87E]" />
          <h2 className="text-lg font-bold font-poetry">إدارة الحساب</h2>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">
              أنت تستخدم المنصة الآن كزائر. سجّل حساباً لحفظ نقاطك ومزامنة تقدمك بين الأجهزة.
            </p>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-5 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold min-h-[44px]"
            >
              تسجيل الدخول أو إنشاء حساب
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
              البريد الإلكتروني: <span dir="ltr">{user.profile.email}</span>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-[#EFECE4] dark:border-[#2A3542]">
              <div className="text-sm font-semibold">تغيير كلمة المرور</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="كلمة المرور الحالية"
                  className="px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] dark:bg-[#0F1419] border border-[#DFD9CE] dark:border-[#2A3542] text-sm"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة (٨ أحرف+)"
                  className="px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] dark:bg-[#0F1419] border border-[#DFD9CE] dark:border-[#2A3542] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                className="px-4 py-2.5 rounded-xl bg-[#EFECE4] hover:bg-[#E5E0D5] dark:bg-[#1E2732] text-sm font-medium min-h-[44px]"
              >
                {passwordBusy ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#EFECE4] dark:border-[#2A3542]">
              <button
                type="button"
                onClick={() => void logout()}
                className="px-4 py-2.5 rounded-xl border border-[#DFD9CE] dark:border-[#2A3542] text-sm font-medium flex items-center gap-2 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف الحساب</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDeleteAccount()}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold min-h-[40px]"
                  >
                    {deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 rounded-xl bg-[#EFECE4] dark:bg-[#1E2732] text-xs font-medium min-h-[40px]"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
