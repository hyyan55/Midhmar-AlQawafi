import React from 'react';
import { LogIn, Sparkles, UserPlus, UserRound, Feather } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface WelcomeScreenProps { onLogin: () => void; onRegister: () => void; onGuest: () => void; }

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister, onGuest }) => {
  const { appName } = useApp();
  return (
    <main className="min-h-dvh relative overflow-hidden flex items-center justify-center px-3 py-3 sm:px-4 sm:py-8 bg-[#F5F1E8] text-[#17233A]">
      <div aria-hidden="true" className="absolute -top-36 -left-28 w-96 h-96 rounded-full border border-[#C6A15B]/25" />
      <div aria-hidden="true" className="absolute -bottom-48 -right-24 w-[30rem] h-[30rem] rounded-full border border-[#14243B]/10" />
      <section className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] overflow-hidden rounded-3xl sm:rounded-[2rem] bg-[#14243B] shadow-2xl shadow-[#14243B]/20">
        <div className="relative min-h-0 lg:min-h-[610px] flex flex-col items-center justify-center text-center px-5 py-5 sm:px-12 sm:py-10 bg-[#14243B] text-[#F5F1E8]">
          <div aria-hidden="true" className="absolute inset-0 opacity-[.08]" style={{backgroundImage:'radial-gradient(#F5F1E8 1px, transparent 1px)',backgroundSize:'24px 24px'}} />
          <div className="relative flex flex-col items-center">
            <img src="/brand-mark.webp" alt="" width="112" height="112" fetchPriority="high" loading="eager" decoding="sync" className="w-16 h-16 sm:w-28 sm:h-28 mb-3 sm:mb-6 drop-shadow-lg" />
            <p className="text-[10px] sm:text-xs tracking-[.2em] sm:tracking-[.28em] text-[#C6A15B] mb-1.5 sm:mb-3">الشعر العربي · ذاكرة وإبداع</p>
            <h1 className="font-poetry text-3xl sm:text-6xl font-bold leading-tight">{appName}</h1>
            <div className="w-12 sm:w-16 h-1 rounded-full bg-[#C6A15B] my-3 sm:my-6" />
            <p className="max-w-md text-xs sm:text-base leading-6 sm:leading-8 text-[#E9E3D3]">ساحة تجمع محبّي الشعر العربي؛ اختبر ذاكرتك، وأكمل الأبيات، واكتشف الشعراء والعصور الأدبية.</p>
          </div>
          <div className="relative mt-3 sm:mt-10 flex items-center gap-2 text-[10px] sm:text-xs text-[#D5D9E2]"><Feather className="w-4 h-4 text-[#C6A15B]" /><span>من المعلّقات إلى روائع الشعر الحديث</span></div>
        </div>
        <div className="bg-[#F5F1E8] px-5 py-5 sm:px-10 sm:py-10 lg:px-12 flex flex-col justify-center">
          <div className="mb-4 sm:mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#C6A15B]/15 px-3 py-1.5 text-xs font-semibold text-[#8B6A1E]"><Sparkles className="w-3.5 h-3.5" /> ابدأ رحلتك الأدبية</span>
            <h2 className="mt-2 sm:mt-5 text-xl sm:text-3xl font-bold font-poetry text-[#14243B]">مرحباً بك في مِضمار</h2>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm leading-6 sm:leading-7 text-[#697586]">اختر طريقة دخولك، وابدأ التحدّي.</p>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <button type="button" onClick={onLogin} className="w-full min-h-11 sm:min-h-14 rounded-xl bg-[#14243B] hover:bg-[#0C192B] text-[#F5F1E8] font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#14243B]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A15B]"><LogIn className="w-4 h-4" /> تسجيل الدخول</button>
            <button type="button" onClick={onRegister} className="w-full min-h-11 sm:min-h-14 rounded-xl border border-[#C9B77E] bg-white/60 hover:bg-white text-[#14243B] font-semibold flex items-center justify-center gap-2 transition-colors"><UserPlus className="w-4 h-4" /> إنشاء حساب جديد</button>
            <div className="flex items-center gap-3 py-1 sm:py-2 text-xs text-[#92919A]"><span className="h-px flex-1 bg-[#DED5C2]" /> أو <span className="h-px flex-1 bg-[#DED5C2]" /></div>
            <button type="button" onClick={onGuest} className="w-full min-h-11 sm:min-h-14 rounded-xl bg-[#EAE2D2] hover:bg-[#E6DCC5] text-[#34415A] font-semibold flex items-center justify-center gap-2 transition-colors"><UserRound className="w-4 h-4" /> المتابعة كضيف</button>
          </div>
          <p className="mt-3 sm:mt-6 text-center text-[11px] sm:text-xs leading-5 sm:leading-6 text-[#777B86]">يمكنك البدء كضيف، ثم إنشاء حساب لاحقاً لحفظ تقدمك ومزامنته.</p>
        </div>
      </section>
    </main>
  );
};
