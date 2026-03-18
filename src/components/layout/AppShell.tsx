import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import type { ClientProfile } from '../../types/client';

interface AppShellProps {
  clients: ClientProfile[];
  activeClient: ClientProfile | null;
  onSwitchClient: (id: string) => void;
  onAddClient: () => void;
  userName?: string;
  onLogout?: () => void;
}

export default function AppShell({ clients, activeClient, onSwitchClient, onAddClient, userName, onLogout }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-off-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          clients={clients}
          activeClient={activeClient}
          onSwitchClient={(id) => { onSwitchClient(id); setSidebarOpen(false); }}
          onAddClient={() => { onAddClient(); setSidebarOpen(false); }}
          userName={userName}
          onLogout={onLogout}
          onNavClick={() => setSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-warm-beige/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-charcoal hover:bg-off-white rounded-lg"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-display text-lg text-charcoal truncate">
            {activeClient?.business.name || 'Social Agency'}
          </h1>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
