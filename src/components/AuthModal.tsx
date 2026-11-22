import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';
import { firebaseAuth, sendPasswordResetEmail } from '../services/firebase.ts';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  initialMode = 'login',
}) => {
  const { login, register, guest, backendAvailable } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [migrateGuest, setMigrateGuest] = useState(true);

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const hasGuestProgress = guest.stats.gamesPlayed > 0 || guest.stats.totalXp > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    if (!backendAvailable) {
      setErrorMessage(
        'نظام الحسابات يتطلب تشغيل الخادم الخلفي أولاً (npm run dev:api). يمكنك متابعة التصفح كزائر الآن.'
      );
      return;
    }
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register({
          displayName,
          username,
          email,
          password,
          migrateGuestProgress: migrateGuest,
        });
        setInfoMessage('تم إنشاء الحساب. افتح رسالة التأكيد المرسلة إلى بريدك لتفعيل الحساب، ثم سجّل الدخول.');
        setMode('login');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        setInfoMessage('إذا كان البريد مسجلاً، فستصلك رسالة من Firebase لإعادة تعيين كلمة المرور.');
        setMode('login');
      } else if (mode === 'reset') {
        const res = await apiClient.resetPassword(resetToken, newPassword);
        setInfoMessage(res.message);
        setMode('login');
        setPassword('');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="إدارة الحساب"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold font-poetry">
            {mode === 'login' && 'تسجيل الدخول'}
            {mode === 'register' && 'إنشاء حساب جديد'}
            {mode === 'forgot' && 'استعادة كلمة المرور'}
            {mode === 'reset' && 'تعيين كلمة مرور جديدة'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[#EEE6D4] dark:hover:bg-[#1E2732]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!backendAvailable && (
          <div className="mb-4 p-3 rounded-xl bg-[#EEE6D4] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-xs text-[#626777] dark:text-[#C5CDDB] leading-relaxed">
            وضع معاينة الواجهة نشط: يتفعّل تسجيل الدخول وإنشاء الحسابات عند تشغيل الخادم الخلفي وربط قاعدة البيانات.
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEE6D4] dark:bg-[#102448] mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#172D50] text-[#17233A] dark:text-[#F7F3E8] shadow-sm'
                  : 'text-[#626777] dark:text-[#C5CDDB]'
              }`}
            >
              دخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#172D50] text-[#17233A] dark:text-[#F7F3E8] shadow-sm'
                  : 'text-[#626777] dark:text-[#C5CDDB]'
              }`}
            >
              حساب جديد
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-900 dark:text-emerald-200">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">الاسم الظاهر</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: سيف الدين الكندي"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm focus:outline-none focus:border-[#14284B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">اسم المستخدم (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="saif_alkindi"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm focus:outline-none focus:border-[#14284B] text-left"
                />
              </div>
            </>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm focus:outline-none focus:border-[#14284B] text-left"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="block text-sm font-medium mb-1.5">كلمة المرور</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="٨ أحرف على الأقل"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm focus:outline-none focus:border-[#14284B]"
              />
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">رمز الاستعادة</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm text-left"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3E8] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] text-sm"
                />
              </div>
            </>
          )}

          {mode === 'register' && hasGuestProgress && (
            <label className="flex items-start gap-3 p-3 rounded-xl bg-[#EEE6D4] dark:bg-[#102448] border border-[#E8DEC8] dark:border-[#2B4164] cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={migrateGuest}
                onChange={(e) => setMigrateGuest(e.target.checked)}
                className="mt-0.5 accent-[#14284B]"
              />
              <span>
                ترحيل تقدم الزائر الحالي ({guest.stats.totalXp} نقطة خبرة و{guest.stats.gamesPlayed} جولات) إلى حسابي الجديد دون تكرار.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#14284B] hover:bg-[#0D1D39] dark:bg-[#E0B84F] dark:hover:bg-[#C69B2F] text-white dark:text-[#102448] font-semibold text-sm transition-colors disabled:opacity-60 min-h-[46px]"
          >
            {submitting
              ? 'جارٍ التنفيذ...'
              : mode === 'login'
                ? 'دخول إلى الحساب'
                : mode === 'register'
                  ? 'إنشاء الحساب'
                  : mode === 'forgot'
                    ? 'إرسال رمز الاستعادة'
                    : 'حفظ كلمة المرور الجديدة'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-[#626777] dark:text-[#C5CDDB]">
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setErrorMessage(null);
              }}
              className="hover:underline py-2"
            >
              نسيت كلمة المرور؟
            </button>
          )}


          {(mode === 'forgot' || mode === 'reset') && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className="hover:underline py-2"
            >
              العودة إلى تسجيل الدخول
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
