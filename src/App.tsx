import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { LayoutShell } from './components/LayoutShell.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { ModesScreen } from './screens/ModesScreen.tsx';
import { GameplayScreen } from './screens/GameplayScreen.tsx';
import { ResultsScreen } from './screens/ResultsScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { LeaderboardsScreen } from './screens/LeaderboardsScreen.tsx';
import { LibraryScreen } from './screens/LibraryScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';

type AuthMode = 'login' | 'register';

const AppRouter: React.FC = () => {
  const { screen, user, isAuthReady } = useApp();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [guestEntered, setGuestEntered] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage.getItem('midhmar:guest-entry') === '1'
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelector('main')?.scrollTo(0, 0);
    });
  }, [screen]);

  useEffect(() => {
    if (user) {
      window.sessionStorage.removeItem('midhmar:guest-entry');
      setGuestEntered(false);
      setAuthModalOpen(false);
    }
  }, [user]);

  const openAuth = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const enterAsGuest = () => {
    window.sessionStorage.setItem('midhmar:guest-entry', '1');
    setGuestEntered(true);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F3E8] dark:bg-[#102448]">
        <div className="flex flex-col items-center gap-3 text-[#14284B] dark:text-[#E0B84F]" role="status">
          <div className="w-9 h-9 rounded-full border-[3px] border-current/20 border-t-current animate-spin" />
          <span className="text-sm text-[#626777] dark:text-[#C5CDDB]">جارٍ تجهيز مِضمار القوافي...</span>
        </div>
      </div>
    );
  }

  if (!user && !guestEntered) {
    return (
      <>
        <WelcomeScreen
          onLogin={() => openAuth('login')}
          onRegister={() => openAuth('register')}
          onGuest={enterAsGuest}
        />
        <AuthModal
          key={authMode}
          open={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <LayoutShell onOpenAuthModal={() => openAuth('login')}>
      {screen === 'home' && <HomeScreen onOpenAuthModal={() => openAuth('register')} />}
      {screen === 'modes' && <ModesScreen />}
      {screen === 'play' && <GameplayScreen />}
      {screen === 'results' && <ResultsScreen />}
      {screen === 'profile' && <ProfileScreen onOpenAuthModal={() => openAuth('register')} />}
      {screen === 'leaderboards' && <LeaderboardsScreen />}
      {screen === 'library' && <LibraryScreen />}
      {screen === 'settings' && <SettingsScreen onOpenAuthModal={() => openAuth('login')} />}
      <AuthModal key={authMode} open={authModalOpen} initialMode={authMode} onClose={() => setAuthModalOpen(false)} />
    </LayoutShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
