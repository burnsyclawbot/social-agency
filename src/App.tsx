import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useClientStore } from './hooks/useClientStore';
import { useAuth } from './hooks/useAuth';
import AppShell from './components/layout/AppShell';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import LoginPage from './pages/LoginPage';
import PlanPage from './pages/PlanPage';
import MediaPage from './pages/MediaPage';
import PublishPage from './pages/PublishPage';
import HistoryPage from './pages/HistoryPage';
import type { ClientProfile } from './types/client';
import { Loader2 } from 'lucide-react';

export default function App() {
  const auth = useAuth();
  const store = useClientStore();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  // Show loading spinner while checking auth
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-dusty-rose" />
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!auth.isAuthenticated) {
    return <LoginPage onLogin={auth.login} onRegister={auth.register} />;
  }

  // Show onboarding if no clients set up
  if (!store.hasClients) {
    return (
      <OnboardingWizard
        onComplete={(client: ClientProfile) => store.addClient(client)}
      />
    );
  }

  const clientId = store.activeClientId || 'default';

  return (
    <BrowserRouter>
      <Routes>
        <Route element={
          <AppShell
            clients={store.clients}
            activeClient={store.activeClient}
            onSwitchClient={store.switchClient}
            onAddClient={() => {/* TODO: show onboarding for new client */}}
            userName={auth.user?.name}
            onLogout={auth.logout}
          />
        }>
          <Route path="/" element={<PlanPage client={store.activeClient} onPlanCreated={setActivePlanId} />} />
          <Route path="/media" element={<MediaPage clientId={clientId} planId={activePlanId} />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
