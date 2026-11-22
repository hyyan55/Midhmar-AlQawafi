import React from 'react';
import { BookOpen, LogIn, Sparkles, UserPlus, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface WelcomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister, onGuest }) => {
  const { appName } = useApp();

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10 bg-[#F7F3E8] dark:bg-[#102448] text-[#17233A] dark:text-[#F7F3E8]">
      <section className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#14284B] dark:bg-[#E0B84F] text-white dark:text-[#102448] flex items-center justify-center shadow-lg shadow-emerald-900/10">
            <BookOpen className="w-8 h-8" strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold tracking-wide text-[#14284B] dark:text-[#E0B84F] mb-2">مرحباً بك في</p>
          <h1 className="text-4xl font-bold font-poetry">{appName}</h1>
          <p className="mt-4 text-sm leading-7 text-[#626777] dark:text-[#C5CDDB]">
            مساحة لاختبار ذاكرتك الشعرية، واكتشاف روائع القصائد وأعلام الشعر العربي.
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-5 sm:p-6 shadow-xl shadow-black/[0.04] space-y-3">
          <button type="button" onClick={onLogin} className="w-full min-h-12 rounded-xl bg-[#14284B] hover:bg-[#0D1D39] dark:bg-[#E0B84F] dark:hover:bg-[#C69B2F] text-white dark:text-[#102448] font-semibold flex items-center justify-center gap-2 transition-colors">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button type="button" onClick={onRegister} className="w-full min-h-12 rounded-xl border border-[#14284B] dark:border-[#E0B84F] text-[#14284B] dark:text-[#E0B84F] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
            <UserPlus className="w-4 h-4" />
            إنشاء حساب جديد
          </button>
          <div className="flex items-center gap-3 py-1 text-xs text-[#8A8B85] dark:text-[#7D8994]">
            <span className="h-px flex-1 bg-[#E8DEC8] dark:bg-[#2B4164]" />
            أو
            <span className="h-px flex-1 bg-[#E8DEC8] dark:bg-[#2B4164]" />
          </div>
          <button type="button" onClick={onGuest} className="w-full min-h-12 rounded-xl bg-[#EEE6D4] hover:bg-[#E5E0D5] dark:bg-[#1E2732] dark:hover:bg-[#273240] text-[#17233A] dark:text-[#F7F3E8] font-semibold flex items-center justify-center gap-2 transition-colors">
            <UserRound className="w-4 h-4" />
            المتابعة كضيف
          </button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[#777A75] dark:text-[#89939D]">
          <Sparkles className="w-3.5 h-3.5" />
          يمكنك اللعب كضيف، وإنشاء حساب لاحقاً لحفظ تقدمك ومزامنته.
        </p>
      </section>
    </main>
  );
};
