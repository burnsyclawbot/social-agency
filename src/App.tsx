import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useClientStore } from './hooks/useClientStore';
import AppShell from './components/layout/AppShell';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import PlanPage from './pages/PlanPage';
import MediaPage from './pages/MediaPage';
import PublishPage from './pages/PublishPage';
import HistoryPage from './pages/HistoryPage';
import type { ClientProfile } from './types/client';

export default function App() {
  const store = useClientStore();

  if (!store.hasClients) {
    return (
      <OnboardingWizard
        onComplete={(client: ClientProfile) => store.addClient(client)}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={
          <AppShell
            clients={store.clients}
            activeClient={store.activeClient}
            onSwitchClient={store.switchClient}
            onAddClient={() => {/* TODO: show onboarding for new client */}}
          />
        }>
          <Route path="/" element={<PlanPage client={store.activeClient} />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/publish" element={<PublishPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
