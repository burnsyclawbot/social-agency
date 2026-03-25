import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, Upload, Send, Clock, Settings, ChevronDown, Plus, LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import type { ClientProfile } from '../../types/client';
import { APP_VERSION } from '../../constants/version';

const NAV_ITEMS = [
  { to: '/', icon: CalendarDays, label: 'Plan' },
  { to: '/media', icon: Upload, label: 'Media' },
  { to: '/publish', icon: Send, label: 'Publish' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  clients: ClientProfile[];
  activeClient: ClientProfile | null;
  onSwitchClient: (id: string) => void;
  onAddClient: () => void;
  userName?: string;
  onLogout?: () => void;
  onNavClick?: () => void;
  guardNavigation?: () => boolean;
  onSaveBeforeNav?: () => Promise<void>;
}

export default function Sidebar({ clients, activeClient, onSwitchClient, onAddClient, userName, onLogout, onNavClick, guardNavigation, onSaveBeforeNav }: SidebarProps) {
  const [showClientMenu, setShowClientMenu] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [savingBeforeNav, setSavingBeforeNav] = useState(false);
  const navigate = useNavigate();
  const hasMultipleClients = clients.length > 1;

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (guardNavigation && !guardNavigation()) {
      e.preventDefault();
      setPendingNav(to);
      return;
    }
    onNavClick?.();
  };

  const confirmDiscard = () => {
    if (pendingNav) {
      navigate(pendingNav);
      setPendingNav(null);
      onNavClick?.();
    }
  };

  const confirmSave = async () => {
    if (!onSaveBeforeNav) return;
    setSavingBeforeNav(true);
    try {
      await onSaveBeforeNav();
      if (pendingNav) {
        navigate(pendingNav);
        setPendingNav(null);
        onNavClick?.();
      }
    } catch {
      // Save failed, stay on page
    } finally {
      setSavingBeforeNav(false);
    }
  };

  return (
    <>
      <aside className="w-64 bg-white border-r border-warm-beige/50 flex flex-col h-screen">
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
              onClick={(e) => handleNavClick(e, to)}
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

        {/* User + logout + version footer */}
        <div className="p-4 border-t border-warm-beige/50 bg-off-white/50">
          {userName && onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-charcoal bg-white border border-warm-beige/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors group mb-3"
            >
              <span className="truncate">{userName}</span>
              <div className="flex items-center gap-1.5 text-soft-gray group-hover:text-red-500 shrink-0 ml-2">
                <span className="text-xs">Sign Out</span>
                <LogOut size={14} />
              </div>
            </button>
          )}
          <p className="text-xs text-soft-gray text-center">
            Social Agency v{APP_VERSION}
          </p>
        </div>
      </aside>

      {/* Unsaved changes modal — 3 buttons */}
      {pendingNav && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPendingNav(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-1 text-center">Unsaved Changes</h3>
            <p className="text-sm text-soft-gray mb-5 text-center">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex flex-col gap-2">
              {onSaveBeforeNav && (
                <button
                  onClick={confirmSave}
                  disabled={savingBeforeNav}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dusty-rose text-white rounded-lg text-sm font-medium hover:bg-dusty-rose/90 disabled:opacity-50 transition-colors"
                >
                  {savingBeforeNav ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              )}
              <button
                onClick={confirmDiscard}
                className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={() => setPendingNav(null)}
                className="w-full px-4 py-2.5 border border-warm-beige/50 text-charcoal rounded-lg text-sm font-medium hover:bg-off-white transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
