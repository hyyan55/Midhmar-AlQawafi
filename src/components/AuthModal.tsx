import React, { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="إدارة الحساب"
    >
      <div className="w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
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
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[#EAE2D2] dark:hover:bg-[#1E2732]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!backendAvailable && (
          <div className="mb-4 p-3 rounded-xl bg-[#EAE2D2] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-xs text-[#697586] dark:text-[#C0CAD6] leading-relaxed">
            وضع معاينة الواجهة نشط: يتفعّل تسجيل الدخول وإنشاء الحسابات عند تشغيل الخادم الخلفي وربط قاعدة البيانات.
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EAE2D2] dark:bg-[#14243B] mb-3 sm:mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#1B2D47] text-[#17233A] dark:text-[#F5F1E8] shadow-sm'
                  : 'text-[#697586] dark:text-[#C0CAD6]'
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
                  ? 'bg-white dark:bg-[#1B2D47] text-[#17233A] dark:text-[#F5F1E8] shadow-sm'
                  : 'text-[#697586] dark:text-[#C0CAD6]'
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

        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">الاسم الظاهر</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: سيف الدين الكندي"
                  className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm focus:outline-none focus:border-[#14243B]"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">اسم المستخدم (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="saif_alkindi"
                  className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm focus:outline-none focus:border-[#14243B] text-left"
                />
              </div>
            </>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                autoComplete="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@example.com"
                className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm focus:outline-none focus:border-[#14243B] text-left"
              />
              <div className="flex flex-wrap items-center gap-2 mt-2" aria-label="اقتراحات نطاق البريد">
                <span className="text-[11px] text-[#697586] dark:text-[#C0CAD6]">اقتراحات:</span>
                {['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setEmail(`${email.split('@')[0]}@${domain}`)}
                    className="px-2 py-1 rounded-lg bg-[#EAE2D2] dark:bg-[#14243B] text-[11px] font-medium text-[#14243B] dark:text-[#C6A15B] hover:ring-1 hover:ring-[#C6A15B]"
                  >
                    @{domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="٨ أحرف على الأقل"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-2 sm:py-2.5 pl-11 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm focus:outline-none focus:border-[#14243B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#697586] dark:text-[#C0CAD6]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">رمز الاستعادة</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm text-left"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 sm:py-2.5 pl-11 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#697586] dark:text-[#C0CAD6]"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'register' && hasGuestProgress && (
            <label className="flex items-start gap-3 p-3 rounded-xl bg-[#EAE2D2] dark:bg-[#14243B] border border-[#E2D8C5] dark:border-[#35465E] cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={migrateGuest}
                onChange={(e) => setMigrateGuest(e.target.checked)}
                className="mt-0.5 accent-[#14243B]"
              />
              <span>
                ترحيل تقدم الزائر الحالي ({guest.stats.totalXp} نقطة خبرة و{guest.stats.gamesPlayed} جولات) إلى حسابي الجديد دون تكرار.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#14243B] hover:bg-[#0C192B] dark:bg-[#C6A15B] dark:hover:bg-[#A98543] text-white dark:text-[#14243B] font-semibold text-sm transition-colors disabled:opacity-60 min-h-[46px]"
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

        <div className="mt-2 sm:mt-3 flex items-center justify-between text-xs text-[#697586] dark:text-[#C0CAD6]">
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
