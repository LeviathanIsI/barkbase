import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  CheckCheck,
  Keyboard,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Bug,
  BookOpen,
  Loader2,
  Clock,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/api';
import * as timeClockApi from '@/features/staff/api-timeclock';
import { useTimezoneUtils } from '@/lib/timezone';

const getInitials = (value) => {
  if (!value) return '';
  return value.split(' ').filter(Boolean).slice(0, 2).map((chunk) => chunk[0]?.toUpperCase()).join('');
};

// Format relative time
const formatRelativeTime = (date, tzFormatShortDate) => {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (tzFormatShortDate) return tzFormatShortDate(then);
  return then.toLocaleDateString();
};

// Notification type icons and colors
const NOTIFICATION_STYLES = {
  booking_created: { icon: '📅', color: 'text-blue-500' },
  booking_updated: { icon: '📝', color: 'text-blue-500' },
  booking_cancelled: { icon: '❌', color: 'text-red-500' },
  check_in: { icon: '✅', color: 'text-green-500' },
  check_out: { icon: '👋', color: 'text-amber-500' },
  payment_received: { icon: '💰', color: 'text-green-500' },
  payment_failed: { icon: '⚠️', color: 'text-red-500' },
  invoice_created: { icon: '📄', color: 'text-blue-500' },
  vaccination_expiring: { icon: '💉', color: 'text-amber-500' },
  vaccination_expired: { icon: '🚨', color: 'text-red-500' },
  task_assigned: { icon: '📋', color: 'text-purple-500' },
  task_completed: { icon: '✓', color: 'text-green-500' },
  message_received: { icon: '💬', color: 'text-blue-500' },
  system: { icon: 'ℹ️', color: 'text-gray-500' },
  alert: { icon: '🔔', color: 'text-amber-500' },
  info: { icon: 'ℹ️', color: 'text-blue-500' },
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
          'flex items-center gap-2 rounded-lg border px-3 py-2 min-h-11 text-sm transition-all',
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

  // Listen for custom event to open search (from keyboard shortcuts)
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

// Live Connection Status Indicator
const LiveIndicator = () => {
  const [status, setStatus] = useState('connecting'); // 'live' | 'connecting' | 'offline'
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Initial check
    setStatus(navigator.onLine ? 'live' : 'offline');

    const handleRealtimeStatus = (event) => {
      const { connected, connecting } = event?.detail || {};
      if (connecting) {
        setStatus('connecting');
      } else if (connected) {
        setStatus('live');
      } else {
        setStatus('offline');
      }
    };

    const handleOnline = () => setStatus('live');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('bb-realtime-status', handleRealtimeStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('bb-realtime-status', handleRealtimeStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusConfig = {
    live: {
      color: 'var(--bb-color-status-positive)',
      label: 'Live',
      tooltip: 'Real-time updates active',
    },
    connecting: {
      color: 'var(--bb-color-status-warning, #f59e0b)',
      label: 'Connecting',
      tooltip: 'Establishing connection...',
    },
    offline: {
      color: 'var(--bb-color-status-negative)',
      label: 'Offline',
      tooltip: 'No connection - changes may not sync',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className="relative hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium cursor-default"
      style={{
        backgroundColor: 'var(--bb-color-bg-elevated)',
        borderColor: 'var(--bb-color-border-subtle)',
        color: 'var(--bb-color-text-muted)',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={cn('h-2 w-2 rounded-full', status === 'connecting' && 'animate-pulse')}
        style={{ backgroundColor: config.color }}
      />
      <span>{config.label}</span>

      {showTooltip && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-md px-2 py-1 text-xs shadow-lg z-50"
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
            color: 'var(--bb-color-text-primary)',
            border: '1px solid var(--bb-color-border-subtle)',
          }}
        >
          {config.tooltip}
        </div>
      )}
    </div>
  );
};

// Notifications Button with Popover
const NotificationsButton = () => {
  const tz = useTimezoneUtils();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count (always)
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  // Fetch notifications (only when open)
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 10,
    enabled: isOpen,
  });

  const notifications = notificationsData?.notifications || [];
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = useCallback((notification) => {
    // Mark as read
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
    // Navigate if has link
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  }, [markReadMutation, navigate]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-all',
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
          {/* Header */}
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
            {unreadCount > 0 && (
              <Button
                variant="link"
                size="xs"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-[color:var(--bb-color-text-muted)] opacity-50 mb-2" />
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">No notifications yet</p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
                  We'll notify you about important updates
                </p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.map((notification) => {
                  const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        'hover:bg-[color:var(--bb-color-bg-elevated)]',
                        !notification.isRead && 'bg-[color:var(--bb-color-accent-soft)]'
                      )}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg flex-shrink-0">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn(
                              'text-sm truncate',
                              notification.isRead
                                ? 'text-[color:var(--bb-color-text-primary)]'
                                : 'font-medium text-[color:var(--bb-color-text-primary)]'
                            )}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-[color:var(--bb-color-accent)] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-[0.65rem] text-[color:var(--bb-color-text-muted)] mt-1">
                            {formatRelativeTime(notification.createdAt, tz.formatShortDate)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2 border-t text-center"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-[color:var(--bb-color-accent)] hover:underline"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Help Button with Dropdown
const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
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

  // Listen for custom event to open shortcuts modal (from keyboard shortcuts handler)
  useEffect(() => {
    const handleOpenShortcuts = () => setShowKeyboardShortcuts(true);
    const handleCloseModal = () => setShowKeyboardShortcuts(false);

    window.addEventListener('bb-open-shortcuts-modal', handleOpenShortcuts);
    window.addEventListener('bb-close-modal', handleCloseModal);

    return () => {
      window.removeEventListener('bb-open-shortcuts-modal', handleOpenShortcuts);
      window.removeEventListener('bb-close-modal', handleCloseModal);
    };
  }, []);

  const helpItems = [
    {
      icon: BookOpen,
      label: 'Help Center',
      href: 'https://help.barkbase.com',
      external: true,
    },
    {
      icon: MessageCircle,
      label: 'Contact Support',
      href: 'mailto:support@barkbase.com',
    },
    { divider: true },
    {
      icon: Sparkles,
      label: "What's New",
      href: '/changelog',
    },
    {
      icon: Bug,
      label: 'Report a Bug',
      href: 'mailto:bugs@barkbase.com?subject=Bug%20Report',
    },
  ];

  // Keyboard shortcuts data
  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['Ctrl', 'K'], description: 'Open search' },
      { keys: ['G', 'H'], description: 'Go to Today/Dashboard' },
      { keys: ['G', 'B'], description: 'Go to Bookings' },
      { keys: ['G', 'O'], description: 'Go to Owners' },
      { keys: ['G', 'P'], description: 'Go to Pets' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
      { keys: ['G', 'T'], description: 'Go to Tasks' },
      { keys: ['G', 'C'], description: 'Go to Calendar' },
      { keys: ['G', 'M'], description: 'Go to Messages' },
      { keys: ['G', 'R'], description: 'Go to Reports' },
      { keys: ['G', 'K'], description: 'Go to Kennels' },
    ]},
    { category: 'Actions', items: [
      { keys: ['N'], description: 'New booking' },
      { keys: ['Ctrl', 'S'], description: 'Save form' },
      { keys: ['Esc'], description: 'Close modal/Cancel' },
    ]},
    { category: 'Calendar', items: [
      { keys: ['\u2190'], description: 'Previous day' },
      { keys: ['\u2192'], description: 'Next day' },
      { keys: ['Shift', '\u2190'], description: 'Previous week' },
      { keys: ['Shift', '\u2192'], description: 'Next week' },
      { keys: ['T'], description: 'Jump to today' },
    ]},
    { category: 'Help', items: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ]},
  ];

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-all',
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
              const content = (
                <>
                  <Icon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                  <span className="flex-1 text-[color:var(--bb-color-text-primary)]">{item.label}</span>
                  {item.shortcut && (
                    <kbd
                      className="text-[0.65rem] px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: 'var(--bb-color-border-subtle)',
                        color: 'var(--bb-color-text-muted)',
                      }}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.external && (
                    <ExternalLink className="h-3 w-3 text-[color:var(--bb-color-text-muted)]" />
                  )}
                </>
              );

              if (item.onClick) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                  >
                    {content}
                  </button>
                );
              }

              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
            onClick={() => setShowKeyboardShortcuts(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--bb-color-bg-surface)',
              borderColor: 'var(--bb-color-border-subtle)',
            }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
                <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                  Keyboard Shortcuts
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowKeyboardShortcuts(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {shortcuts.map((section) => (
                <div key={section.category} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bb-color-text-muted)] mb-3">
                    {section.category}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-[color:var(--bb-color-text-primary)]">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx}>
                              <kbd
                                className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 text-xs font-medium rounded border"
                                style={{
                                  backgroundColor: 'var(--bb-color-bg-elevated)',
                                  borderColor: 'var(--bb-color-border-subtle)',
                                  color: 'var(--bb-color-text-primary)',
                                }}
                              >
                                {key}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-[color:var(--bb-color-text-muted)] mx-0.5">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div
              className="px-6 py-3 border-t text-center"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                Press <kbd className="rounded border px-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Time Clock Button with Dropdown
const TimeClockButton = () => {
  const tz = useTimezoneUtils();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentDuration, setCurrentDuration] = useState({ hours: 0, mins: 0, secs: 0 });

  // State from API
  const [status, setStatus] = useState('out'); // 'out' | 'in' | 'break'
  const [clockedInTime, setClockedInTime] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [weekTotal, setWeekTotal] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);

  // Fetch status on mount and when dropdown opens
  const fetchStatus = useCallback(async () => {
    try {
      const response = await timeClockApi.getTimeStatus();
      const data = response.data || response;

      if (data.isClockedIn) {
        setStatus(data.isOnBreak ? 'break' : 'in');
        setClockedInTime(data.clockIn ? new Date(data.clockIn) : null);
        setBreakStartTime(data.breakStart ? new Date(data.breakStart) : null);
        setTodayMinutes(data.workedMinutes || 0);
      } else {
        setStatus('out');
        setClockedInTime(null);
        setBreakStartTime(null);
        setTodayMinutes(0);
      }
      setWeekTotal(data.weekTotal || 0);
    } catch (error) {
      console.error('[TimeClock] Failed to fetch status:', error);
    }
  }, []);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live timer update every second when clocked in
  useEffect(() => {
    if (status === 'out' || !clockedInTime) {
      setCurrentDuration({ hours: 0, mins: 0, secs: 0 });
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const startTime = status === 'break' && breakStartTime ? breakStartTime : clockedInTime;
      const diff = now - startTime;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCurrentDuration({ hours, mins, secs });
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [status, clockedInTime, breakStartTime]);

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      const response = await timeClockApi.clockIn();
      const data = response.data || response;

      if (data.success || data.id) {
        setStatus('in');
        setClockedInTime(new Date(data.clockIn || Date.now()));
        await fetchStatus();
      }
    } catch (error) {
      // Silent fail - UI will show current state
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      const response = await timeClockApi.clockOut();
      const data = response.data || response;

      if (data.success || data.id) {
        setStatus('out');
        setClockedInTime(null);
        setBreakStartTime(null);
        await fetchStatus();
      }
    } catch (error) {
      // Silent fail - UI will show current state
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setIsLoading(true);
    try {
      const response = await timeClockApi.startBreak();
      const data = response.data || response;

      if (data.success || data.id) {
        setStatus('break');
        setBreakStartTime(new Date(data.breakStart || Date.now()));
      }
    } catch (error) {
      // Silent fail - UI will show current state
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsLoading(true);
    try {
      const response = await timeClockApi.endBreak();
      const data = response.data || response;

      if (data.success || data.id) {
        setStatus('in');
        setBreakStartTime(null);
      }
    } catch (error) {
      // Silent fail - UI will show current state
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate today's hours from minutes
  const todayHours = Math.floor(todayMinutes / 60);
  const todayMins = todayMinutes % 60;

  const formatTime = (date) => {
    if (!date) return '';
    return tz.formatTime(date);
  };

  const isMutating = isLoading;

  const statusConfig = {
    out: { label: 'Clocked Out', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    in: { label: 'Clocked In', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    break: { label: 'On Break', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-all',
          'hover:bg-[color:var(--bb-color-bg-elevated)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
        aria-label="Time Clock"
      >
        <Clock className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        {status !== 'out' && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              status === 'in' ? 'bg-green-500' : 'bg-amber-500'
            )} />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-lg border shadow-xl z-50"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
              <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                Time Clock
              </span>
            </div>
          </div>

          {/* Status & Timer */}
          <div className="p-4">
            {/* Status Row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">Status</span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusConfig[status].color)}>
                {statusConfig[status].label}
              </span>
            </div>

            {/* Since time when clocked in */}
            {status !== 'out' && clockedInTime && (
              <div className="text-xs text-[color:var(--bb-color-text-muted)] mb-3">
                {status === 'break' ? 'Break started' : 'Since'} {formatTime(status === 'break' ? breakStartTime : clockedInTime)}
              </div>
            )}

            {/* Live Timer */}
            {status !== 'out' && (
              <div className="flex items-center justify-center gap-2 py-3 mb-3 rounded-lg bg-[color:var(--bb-color-bg-elevated)]">
                <Clock className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
                <span className="text-2xl font-bold font-mono text-[color:var(--bb-color-text-primary)]">
                  {String(currentDuration.hours).padStart(2, '0')}:
                  {String(currentDuration.mins).padStart(2, '0')}:
                  {String(currentDuration.secs).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {status === 'out' ? (
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Clock In
                </button>
              ) : status === 'in' ? (
                <>
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={isMutating}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Clock Out
                  </button>
                  <button
                    type="button"
                    onClick={handleStartBreak}
                    disabled={isMutating}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[color:var(--bb-color-bg-elevated)] disabled:opacity-50"
                    style={{ borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '☕'} Break
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEndBreak}
                  disabled={isMutating}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  End Break
                </button>
              )}
            </div>
          </div>

          {/* Totals */}
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">Today</span>
              <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                {status !== 'out'
                  ? `${todayHours + currentDuration.hours}h ${todayMins + currentDuration.mins}m`
                  : `${todayHours}h ${todayMins}m`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">This Week</span>
              <span className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                {weekTotal ? `${Math.floor(weekTotal / 60)}h ${weekTotal % 60}m` : '0h 0m'}
              </span>
            </div>
          </div>

          {/* Recent History */}
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <p className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-2">Recent</p>
            <div className="space-y-1.5">
              {status !== 'out' && clockedInTime && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[color:var(--bb-color-text-muted)]">
                    Today {formatTime(clockedInTime)}
                  </span>
                  <span className={cn(
                    'font-medium',
                    status === 'in' ? 'text-green-600' : 'text-amber-600'
                  )}>
                    {status === 'in' ? 'In' : 'Break'}
                  </span>
                </div>
              )}
              {status === 'out' && (
                <p className="text-xs text-[color:var(--bb-color-text-muted)] italic">No recent entries</p>
              )}
            </div>
          </div>
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
  const accountCode = authAccountCode || tenantAccountCode;
  const logout = useAuthStore((state) => state.logout);
  const initials = useMemo(() => getInitials(user?.fullName || user?.name || user?.email || ''), [user]);

  const handleCopyAccountCode = useCallback(() => {
    if (accountCode) {
      navigator.clipboard.writeText(accountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [accountCode]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

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
            {user?.fullName || user?.name}
          </p>
          {user?.email && (
            <p className="text-[0.7rem] leading-tight text-[color:var(--bb-color-text-muted)]">
              {user.email}
            </p>
          )}
        </div>
        <Avatar size="sm" src={user?.avatarUrl} fallback={initials} />
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
              <Avatar size="md" src={user?.avatarUrl} fallback={initials} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] truncate">
                  {user?.fullName || user?.name || 'User'}
                </p>
                {user?.email && (
                  <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
                    {user.email}
                  </p>
                )}
                {user?.role && (
                  <p className="text-[0.65rem] text-[color:var(--bb-color-accent)] mt-0.5 capitalize">
                    {user.role}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Code - Prominent for support */}
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
                {accountCode || '—'}
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

          {/* Logout */}
          <div
            className="py-1 border-t"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors text-red-600 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
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
          <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-[color:var(--bb-color-text-muted)] transition-colors hover:bg-[color:var(--bb-color-bg-elevated)] hover:text-[color:var(--bb-color-text-primary)] lg:hidden" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} onClick={onToggleSidebar} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <LocationSwitcher />
          <LiveIndicator />
        </div>
        {/* Center: Search + Shortcuts hint */}
        <div className="flex-1 max-w-xl hidden sm:flex items-center gap-3"><div className="flex-1 max-w-lg"><GlobalSearch /></div><span className="hidden lg:flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)] whitespace-nowrap">Press <kbd className="rounded border px-1.5 py-0.5 text-[0.65rem] font-medium" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>?</kbd> for shortcuts</span></div>
        {/* Right: Actions + User */}
        <div className="flex items-center gap-2">
          <button type="button" className="sm:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg border" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }} aria-label="Search"><Search className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" /></button>
          <NotificationsButton />
          <HelpButton />
          <TimeClockButton />
          <ThemeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
