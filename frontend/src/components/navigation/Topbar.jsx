import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, MapPin, Menu, Search, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/utils';

const getInitials = (value) => {
  if (!value) return '';
  return value.split(' ').filter(Boolean).slice(0, 2).map((chunk) => chunk[0]?.toUpperCase()).join('');
};

// Location Switcher Component
const LocationSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const tenant = useTenantStore((state) => state.tenant);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const locations = tenant?.locations || [{ id: 'main', name: tenant?.name || 'Main Location', isDefault: true }];
  const currentLocation = locations.find((l) => l.isDefault) || locations[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]'
        )}
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        aria-label="Switch location"
      >
        <MapPin className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
        <span className="hidden sm:inline font-medium text-[color:var(--bb-color-text-primary)]">{currentLocation?.name}</span>
        <ChevronDown className={cn('h-4 w-4 text-[color:var(--bb-color-text-muted)] transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border shadow-lg z-50" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
          <div className="p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">Locations</p>
            {locations.map((loc) => (
              <button key={loc.id} type="button" onClick={() => setIsOpen(false)} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]', loc.id === currentLocation?.id && 'bg-[color:var(--bb-color-accent-soft)]')}>
                <MapPin className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <span className="text-[color:var(--bb-color-text-primary)]">{loc.name}</span>
                {loc.isDefault && <span className="ml-auto text-xs text-[color:var(--bb-color-accent)]">Default</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Global Search Component
const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsOpen(true); }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) { navigate(`/search?q=${encodeURIComponent(query)}`); setIsOpen(false); setQuery(''); }
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all w-full hover:bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]')} style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label="Search">
        <Search className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <span className="hidden md:inline text-[color:var(--bb-color-text-muted)] flex-1 text-left">Search pets, owners, bookings...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] font-medium text-[color:var(--bb-color-text-muted)]" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>⌘K</kbd>
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0" style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }} onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-xl mx-4 rounded-xl border shadow-2xl" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
            <form onSubmit={handleSearch}>
              <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <Search className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pets, owners, bookings..." className="flex-1 bg-transparent text-[color:var(--bb-color-text-primary)] placeholder:text-[color:var(--bb-color-text-muted)] focus:outline-none" />
                <button type="button" onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-[color:var(--bb-color-bg-elevated)]"><X className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" /></button>
              </div>
            </form>
            <div className="p-4 text-center text-sm text-[color:var(--bb-color-text-muted)]">
              <p>Type to search across all records</p>
              <p className="mt-1 text-xs">Press <kbd className="rounded border px-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>Enter</kbd> to search or <kbd className="rounded border px-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>Esc</kbd> to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Notifications Button
const NotificationsButton = () => {
  const [hasUnread] = useState(true);
  return (
    <button type="button" className={cn('relative flex items-center justify-center rounded-lg border p-2 transition-all hover:bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]')} style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label={hasUnread ? 'Notifications (unread)' : 'Notifications'}>
      <Bell className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
      {hasUnread && <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>}
    </button>
  );
};

// Help Button
const HelpButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative">
      <button type="button" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} className={cn('flex items-center justify-center rounded-lg border p-2 transition-all hover:bg-[color:var(--bb-color-bg-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]')} style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label="Help & Support">
        <HelpCircle className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
      </button>
      {showTooltip && <div className="absolute right-0 top-full mt-2 whitespace-nowrap rounded-md px-2 py-1 text-xs shadow-lg z-50" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', color: 'var(--bb-color-text-primary)' }}>Help & Support</div>}
    </div>
  );
};

const Topbar = ({ onToggleSidebar }) => {
  const user = useAuthStore((state) => state.user);
  const [isRealtimeConnected, setRealtimeConnected] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleStatus = (event) => { const connected = event?.detail?.connected; if (typeof connected === 'boolean') setRealtimeConnected(connected); };
    const handleOnline = () => setRealtimeConnected(true);
    const handleOffline = () => setRealtimeConnected(false);
    window.addEventListener('bb-realtime-status', handleStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('bb-realtime-status', handleStatus); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const initials = useMemo(() => getInitials(user?.fullName || user?.name || user?.email || ''), [user]);

  return (
    <header className="sticky top-0 z-30 flex w-full border-b" style={{ backgroundColor: 'var(--bb-color-topbar-bg)', borderColor: 'var(--bb-color-topbar-border)', boxShadow: 'var(--bb-color-topbar-shadow)' }}>
      <div className="mx-auto flex h-[var(--bb-topbar-height,56px)] w-full items-center justify-between gap-4 px-[var(--bb-space-4,1rem)] sm:px-[var(--bb-space-6,1.5rem)] lg:px-[var(--bb-space-8,2rem)]">
        {/* Left: Mobile menu + Location */}
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border text-[color:var(--bb-color-text-muted)] transition-colors hover:bg-[color:var(--bb-color-bg-elevated)] hover:text-[color:var(--bb-color-text-primary)] lg:hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} onClick={onToggleSidebar} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <LocationSwitcher />
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium" style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-muted)' }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isRealtimeConnected ? 'var(--bb-color-status-positive)' : 'var(--bb-color-status-negative)' }} />
            <span>{isRealtimeConnected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
        {/* Center: Search */}
        <div className="flex-1 max-w-lg hidden sm:block"><GlobalSearch /></div>
        {/* Right: Actions + User */}
        <div className="flex items-center gap-2">
          <button type="button" className="sm:hidden flex items-center justify-center rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label="Search"><Search className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" /></button>
          <NotificationsButton />
          <HelpButton />
          <ThemeToggle />
          <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div className="hidden text-right md:block">
              <p className="text-[0.8125rem] font-medium leading-tight text-[color:var(--bb-color-text-primary)]">{user?.fullName || user?.name}</p>
              {user?.email && <p className="text-[0.7rem] leading-tight text-[color:var(--bb-color-text-muted)]">{user.email}</p>}
            </div>
            <Avatar size="sm" src={user?.avatarUrl} fallback={initials} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

