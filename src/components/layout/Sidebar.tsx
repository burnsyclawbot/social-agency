import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Upload, Send, Clock, ChevronDown, Plus } from 'lucide-react';
import type { ClientProfile } from '../../types/client';

const NAV_ITEMS = [
  { to: '/', icon: CalendarDays, label: 'Plan' },
  { to: '/media', icon: Upload, label: 'Media' },
  { to: '/publish', icon: Send, label: 'Publish' },
  { to: '/history', icon: Clock, label: 'History' },
];

interface SidebarProps {
  clients: ClientProfile[];
  activeClient: ClientProfile | null;
  onSwitchClient: (id: string) => void;
  onAddClient: () => void;
}

export default function Sidebar({ clients, activeClient, onSwitchClient, onAddClient }: SidebarProps) {
  const [showClientMenu, setShowClientMenu] = useState(false);
  const hasMultipleClients = clients.length > 1;

  return (
    <aside className="w-64 bg-white border-r border-warm-beige/50 flex flex-col min-h-screen">
      {/* Client header / switcher */}
      <div className="p-6 border-b border-warm-beige/50">
        {hasMultipleClients ? (
          <div className="relative">
            <button
              onClick={() => setShowClientMenu(!showClientMenu)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h1 className="font-display text-xl text-charcoal leading-tight">
                  {activeClient?.business.name || 'Select Client'}
                </h1>
                <p className="text-xs text-soft-gray mt-0.5">
                  {activeClient?.business.city}{activeClient?.business.state ? `, ${activeClient.business.state}` : ''}
                </p>
              </div>
              <ChevronDown size={16} className={`text-soft-gray transition-transform ${showClientMenu ? 'rotate-180' : ''}`} />
            </button>

            {showClientMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-warm-beige/50 rounded-lg shadow-lg z-20">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => { onSwitchClient(client.id); setShowClientMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-dusty-rose/5 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                      client.id === activeClient?.id ? 'bg-dusty-rose/10 text-dusty-rose' : 'text-charcoal'
                    }`}
                  >
                    <p className="font-medium">{client.business.name}</p>
                    <p className="text-xs text-soft-gray">{client.business.city}</p>
                  </button>
                ))}
                <button
                  onClick={() => { onAddClient(); setShowClientMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-dusty-rose hover:bg-dusty-rose/5 border-t border-warm-beige/30 rounded-b-lg"
                >
                  <Plus size={14} />
                  Add new client
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="font-display text-xl text-charcoal leading-tight">
              {activeClient?.business.name || 'Social Manager'}
            </h1>
            <p className="text-xs text-soft-gray mt-0.5">
              {activeClient?.business.city}{activeClient?.business.state ? `, ${activeClient.business.state}` : ''}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-dusty-rose/10 text-dusty-rose'
                  : 'text-soft-gray hover:bg-warm-beige/20 hover:text-charcoal'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-warm-beige/50">
        <p className="text-xs text-soft-gray">
          {activeClient?.business.website || 'Social Media Manager'}
        </p>
      </div>
    </aside>
  );
}
