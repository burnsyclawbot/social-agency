import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import type { ClientProfile } from '../../types/client';

interface AppShellProps {
  clients: ClientProfile[];
  activeClient: ClientProfile | null;
  onSwitchClient: (id: string) => void;
  onAddClient: () => void;
}

export default function AppShell({ clients, activeClient, onSwitchClient, onAddClient }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-off-white">
      <Sidebar
        clients={clients}
        activeClient={activeClient}
        onSwitchClient={onSwitchClient}
        onAddClient={onAddClient}
      />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
