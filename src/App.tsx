import { useState, useCallback, useRef } from 'react';
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
import SettingsPage from './pages/SettingsPage';
import type { ClientProfile } from './types/client';
import { Loader2 } from 'lucide-react';

export default function App() {
  const auth = useAuth();
  const store = useClientStore(auth.isAuthenticated);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const settingsDirtyRef = useRef(false);
  const planDirtyRef = useRef(false);
  const settingsSaveRef = useRef<(() => Promise<void>) | null>(null);
  const planSaveRef = useRef<(() => Promise<void>) | null>(null);

  const handleSettingsDirtyChange = useCallback((dirty: boolean, saveFn?: () => Promise<void>) => {
    settingsDirtyRef.current = dirty;
    if (saveFn) settingsSaveRef.current = saveFn;
  }, []);

  const handlePlanDirtyChange = useCallback((dirty: boolean, saveFn?: () => Promise<void>) => {
    planDirtyRef.current = dirty;
    if (saveFn) planSaveRef.current = saveFn;
  }, []);

  const guardNavigation = useCallback(() => {
    return !settingsDirtyRef.current && !planDirtyRef.current;
  }, []);

  const handleSaveBeforeNav = useCallback(async () => {
    if (settingsDirtyRef.current && settingsSaveRef.current) {
      await settingsSaveRef.current();
    }
    if (planDirtyRef.current && planSaveRef.current) {
      await planSaveRef.current();
    }
  }, []);

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

  // Show loading spinner while fetching clients
  if (!store.loaded) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-dusty-rose" />
      </div>
    );
  }

  // Show onboarding if no clients set up OR user clicked "Add new client"
  if (!store.hasClients || showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={async (client: ClientProfile) => {
          await store.addClient(client);
          setShowOnboarding(false);
        }}
        onCancel={store.hasClients ? () => setShowOnboarding(false) : undefined}
        userName={auth.user?.name}
        onLogout={auth.logout}
        isAddingClient={store.hasClients}
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
            onAddClient={() => setShowOnboarding(true)}
            userName={auth.user?.name}
            onLogout={auth.logout}
            guardNavigation={guardNavigation}
            onSaveBeforeNav={handleSaveBeforeNav}
          />
        }>
          <Route path="/" element={<PlanPage client={store.activeClient} onPlanCreated={setActivePlanId} onDirtyChange={handlePlanDirtyChange} />} />
          <Route path="/media" element={<MediaPage clientId={clientId} planId={activePlanId} />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage client={store.activeClient} onSave={store.updateClient} onDelete={store.removeClient} onAddClient={() => setShowOnboarding(true)} onDirtyChange={handleSettingsDirtyChange} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
