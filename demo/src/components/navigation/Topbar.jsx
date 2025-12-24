/**
 * Demo Topbar Component
 * Simplified topbar for demo mode.
 * Removes real API calls, uses demo user data.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Copy,
  HelpCircle,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  User,
  X,
  Check,
  Keyboard,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Bug,
  BookOpen,
  Clock,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
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
    const handleOpenSearch = () => setIsOpen(true);
    const handleCloseModal = () => setIsOpen(false);

    window.addEventListener('bb-open-search', handleOpenSearch);
    window.addEventListener('bb-close-modal', handleCloseModal);

    return () => {
      window.removeEventListener('bb-open-search', handleOpenSearch);
      window.removeEventListener('bb-close-modal', handleCloseModal);
    };
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
        <kbd className="hidden lg:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] font-medium text-[color:var(--bb-color-text-muted)]" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>Ctrl+K</kbd>
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

// Live Connection Status Indicator (Demo always shows "Demo Mode")
const LiveIndicator = () => {
  return (
    <div
      className="relative hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium cursor-default"
      style={{
        backgroundColor: 'var(--bb-color-bg-elevated)',
        borderColor: 'var(--bb-color-border-subtle)',
        color: 'var(--bb-color-text-muted)',
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: 'var(--bb-color-status-positive)' }}
      />
      <span>Demo</span>
    </div>
  );
};

// Notifications Button (Simplified for demo)
const NotificationsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Demo notifications
  const notifications = [
    { id: 1, title: 'New booking created', message: 'Luna (Golden Retriever) booked for Dec 24-28', type: 'booking_created', isRead: false, createdAt: new Date() },
    { id: 2, title: 'Vaccination expiring soon', message: 'Max needs rabies vaccination by Dec 31', type: 'vaccination_expiring', isRead: false, createdAt: new Date(Date.now() - 3600000) },
    { id: 3, title: 'Check-in reminder', message: 'Bailey arriving at 10:00 AM today', type: 'check_in', isRead: true, createdAt: new Date(Date.now() - 7200000) },
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center justify-center rounded-lg border p-2 transition-all',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      >
        <Bell className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border shadow-xl z-50"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto py-1">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  'hover:bg-[color:var(--bb-color-bg-elevated)]',
                  !notification.isRead && 'bg-[color:var(--bb-color-accent-soft)]'
                )}
              >
                <div className="flex gap-3">
                  <span className="text-lg flex-shrink-0">
                    {notification.type === 'booking_created' ? '📅' : notification.type === 'vaccination_expiring' ? '💉' : '✅'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      !notification.isRead && 'font-medium',
                      'text-[color:var(--bb-color-text-primary)]'
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Help Button with Dropdown
const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const helpItems = [
    { icon: BookOpen, label: 'Help Center', href: '#', external: true },
    { icon: MessageCircle, label: 'Contact Support', href: '#' },
    { divider: true },
    { icon: Sparkles, label: "What's New", href: '#' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center rounded-lg border p-2 transition-all',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
        aria-label="Help & Support"
      >
        <HelpCircle className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border shadow-lg z-50 py-1"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {helpItems.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-1 border-t"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                />
              );
            }

            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
              >
                <Icon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <span className="flex-1 text-[color:var(--bb-color-text-primary)]">{item.label}</span>
                {item.external && (
                  <ExternalLink className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Profile Dropdown Component
const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const authAccountCode = useAuthStore((state) => state.accountCode);
  const tenantAccountCode = useTenantStore((state) => state.tenant?.accountCode);
  const accountCode = authAccountCode || tenantAccountCode || 'BK-DEMO01';
  const initials = useMemo(() => getInitials(user?.fullName || user?.name || user?.email || ''), [user]);

  const handleCopyAccountCode = useCallback(() => {
    if (accountCode) {
      navigator.clipboard.writeText(accountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [accountCode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = useCallback((path) => {
    setIsOpen(false);
    navigate(path);
  }, [navigate]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 pl-2 border-l rounded-r-lg py-1.5 pr-2 transition-all',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]'
        )}
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="hidden text-right md:block">
          <p className="text-[0.8125rem] font-medium leading-tight text-[color:var(--bb-color-text-primary)]">
            {user?.fullName || user?.name || 'Demo User'}
          </p>
          {user?.email && (
            <p className="text-[0.7rem] leading-tight text-[color:var(--bb-color-text-muted)]">
              {user.email}
            </p>
          )}
        </div>
        <Avatar size="sm" src={user?.avatarUrl} fallback={initials || 'DU'} />
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)] transition-transform hidden sm:block',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border shadow-xl z-50"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {/* User Info Header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <Avatar size="md" src={user?.avatarUrl} fallback={initials || 'DU'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                  {user?.fullName || user?.name || 'Demo User'}
                </p>
                {user?.email && (
                  <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                    {user.email}
                  </p>
                )}
                <p className="text-[0.65rem] text-[color:var(--bb-color-accent)] mt-0.5 capitalize">
                  Admin (Demo)
                </p>
              </div>
            </div>
          </div>

          {/* Account Code */}
          <div
            className="px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <p className="text-[0.65rem] text-[color:var(--bb-color-text-muted)] mb-1">
              Account Code
            </p>
            <button
              type="button"
              onClick={handleCopyAccountCode}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md border transition-all hover:bg-[color:var(--bb-color-bg-elevated)]"
              style={{
                borderColor: 'var(--bb-color-border-default)',
                backgroundColor: 'var(--bb-color-bg-surface)',
              }}
              title="Click to copy"
            >
              <span className="flex-1 text-left text-sm font-semibold text-[color:var(--bb-color-accent)]">
                {accountCode}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <Copy className="h-4 w-4 text-[color:var(--bb-color-text-muted)] flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleNavigate('/settings/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
            >
              <User className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-[color:var(--bb-color-text-primary)]">Your Profile</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/settings')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
            >
              <Settings className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-[color:var(--bb-color-text-primary)]">Settings</span>
            </button>
          </div>

          {/* Logout - Disabled in demo */}
          <div
            className="py-1 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--bb-color-text-muted)] cursor-not-allowed opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out (Demo Mode)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Topbar = ({ onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 flex w-full border-b" style={{ backgroundColor: 'var(--bb-color-topbar-bg)', borderColor: 'var(--bb-color-topbar-border)', boxShadow: 'var(--bb-color-topbar-shadow)' }}>
      <div className="mx-auto flex h-[var(--bb-topbar-height,56px)] w-full items-center justify-between gap-4 px-[var(--bb-space-4,1rem)] sm:px-[var(--bb-space-6,1.5rem)] lg:px-[var(--bb-space-8,2rem)]">
        {/* Left: Mobile menu + Location */}
        <div className="flex items-center gap-3">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border text-[color:var(--bb-color-text-muted)] transition-colors hover:bg-[color:var(--bb-color-bg-elevated)] hover:text-[color:var(--bb-color-text-primary)] lg:hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} onClick={onToggleSidebar} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <LocationSwitcher />
          <LiveIndicator />
        </div>
        {/* Center: Search */}
        <div className="flex-1 max-w-lg hidden sm:block"><GlobalSearch /></div>
        {/* Right: Actions + User */}
        <div className="flex items-center gap-2">
          <button type="button" className="sm:hidden flex items-center justify-center rounded-lg border p-2" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label="Search"><Search className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" /></button>
          <NotificationsButton />
          <HelpButton />
          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
