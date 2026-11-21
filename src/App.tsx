import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { LayoutShell } from './components/LayoutShell.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { ModesScreen } from './screens/ModesScreen.tsx';
import { GameplayScreen } from './screens/GameplayScreen.tsx';
import { ResultsScreen } from './screens/ResultsScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { LeaderboardsScreen } from './screens/LeaderboardsScreen.tsx';
import { LibraryScreen } from './screens/LibraryScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';

const AppRouter: React.FC = () => {
  const { screen } = useApp();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const openAuth = () => setAuthModalOpen(true);

  return (
    <LayoutShell onOpenAuthModal={openAuth}>
      {screen === 'home' && <HomeScreen onOpenAuthModal={openAuth} />}
      {screen === 'modes' && <ModesScreen />}
      {screen === 'play' && <GameplayScreen />}
      {screen === 'results' && <ResultsScreen />}
      {screen === 'profile' && <ProfileScreen onOpenAuthModal={openAuth} />}
      {screen === 'leaderboards' && <LeaderboardsScreen />}
      {screen === 'library' && <LibraryScreen />}
      {screen === 'settings' && <SettingsScreen onOpenAuthModal={openAuth} />}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
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
