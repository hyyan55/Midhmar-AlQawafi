import React from 'react';
import { LogIn, Sparkles, UserPlus, UserRound, Feather } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface WelcomeScreenProps { onLogin: () => void; onRegister: () => void; onGuest: () => void; }

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin, onRegister, onGuest }) => {
  const { appName } = useApp();
  return (
    <main className="min-h-dvh relative overflow-hidden flex items-center justify-center px-4 py-8 bg-[#F5F1E8] text-[#17233A]">
      <div aria-hidden="true" className="absolute -top-36 -left-28 w-96 h-96 rounded-full border border-[#C6A15B]/25" />
      <div aria-hidden="true" className="absolute -bottom-48 -right-24 w-[30rem] h-[30rem] rounded-full border border-[#14243B]/10" />
      <section className="relative w-full max-w-5xl grid lg:grid-cols-[1.05fr_.95fr] overflow-hidden rounded-[2rem] bg-[#14243B] shadow-2xl shadow-[#14243B]/20">
        <div className="relative min-h-[270px] lg:min-h-[610px] flex flex-col items-center justify-center text-center px-7 py-10 sm:px-12 bg-[#14243B] text-[#F5F1E8]">
          <div aria-hidden="true" className="absolute inset-0 opacity-[.08]" style={{backgroundImage:'radial-gradient(#F5F1E8 1px, transparent 1px)',backgroundSize:'24px 24px'}} />
          <div className="relative flex flex-col items-center">
            <img src="/brand-mark.webp" alt="" className="w-24 h-24 sm:w-28 sm:h-28 mb-6 drop-shadow-lg" />
            <p className="text-xs tracking-[.28em] text-[#C6A15B] mb-3">الشعر العربي · ذاكرة وإبداع</p>
            <h1 className="font-poetry text-5xl sm:text-6xl font-bold leading-tight">{appName}</h1>
            <div className="w-16 h-1 rounded-full bg-[#C6A15B] my-6" />
            <p className="max-w-md text-sm sm:text-base leading-8 text-[#E9E3D3]">ساحة تجمع محبّي الشعر العربي؛ اختبر ذاكرتك، وأكمل الأبيات، واكتشف الشعراء والعصور الأدبية.</p>
          </div>
          <div className="relative mt-10 flex items-center gap-2 text-xs text-[#D5D9E2]"><Feather className="w-4 h-4 text-[#C6A15B]" /><span>من المعلّقات إلى روائع الشعر الحديث</span></div>
        </div>
        <div className="bg-[#F5F1E8] px-6 py-10 sm:px-10 lg:px-12 flex flex-col justify-center">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#C6A15B]/15 px-3 py-1.5 text-xs font-semibold text-[#8B6A1E]"><Sparkles className="w-3.5 h-3.5" /> ابدأ رحلتك الأدبية</span>
            <h2 className="mt-5 text-2xl sm:text-3xl font-bold font-poetry text-[#14243B]">مرحباً بك في مِضمار</h2>
            <p className="mt-2 text-sm leading-7 text-[#697586]">اختر طريقة دخولك، وابدأ التحدّي.</p>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={onLogin} className="w-full min-h-14 rounded-xl bg-[#14243B] hover:bg-[#0C192B] text-[#F5F1E8] font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#14243B]/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A15B]"><LogIn className="w-4 h-4" /> تسجيل الدخول</button>
            <button type="button" onClick={onRegister} className="w-full min-h-14 rounded-xl border border-[#C9B77E] bg-white/60 hover:bg-white text-[#14243B] font-semibold flex items-center justify-center gap-2 transition-colors"><UserPlus className="w-4 h-4" /> إنشاء حساب جديد</button>
            <div className="flex items-center gap-3 py-2 text-xs text-[#92919A]"><span className="h-px flex-1 bg-[#DED5C2]" /> أو <span className="h-px flex-1 bg-[#DED5C2]" /></div>
            <button type="button" onClick={onGuest} className="w-full min-h-14 rounded-xl bg-[#EAE2D2] hover:bg-[#E6DCC5] text-[#34415A] font-semibold flex items-center justify-center gap-2 transition-colors"><UserRound className="w-4 h-4" /> المتابعة كضيف</button>
          </div>
          <p className="mt-6 text-center text-xs leading-6 text-[#777B86]">يمكنك البدء كضيف، ثم إنشاء حساب لاحقاً لحفظ تقدمك ومزامنته.</p>
        </div>
      </section>
    </main>
  );
};
