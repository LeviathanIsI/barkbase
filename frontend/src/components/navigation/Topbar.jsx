import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/utils';

const getInitials = (value) => {
  if (!value) return '';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('');
};

const Topbar = ({ onToggleSidebar }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const [isRealtimeConnected, setRealtimeConnected] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleStatus = (event) => {
      const connected = event?.detail?.connected;
      if (typeof connected === 'boolean') {
        setRealtimeConnected(connected);
      }
    };
    const handleOnline = () => setRealtimeConnected(true);
    const handleOffline = () => setRealtimeConnected(false);

    window.addEventListener('bb-realtime-status', handleStatus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('bb-realtime-status', handleStatus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initials = useMemo(() => {
    const source = user?.fullName || user?.name || user?.email || '';
    return getInitials(source);
  }, [user]);

  const tenantName = tenant?.name ?? tenant?.slug ?? 'BarkBase';
  const userEmail = user?.email;

  return (
    <header
      className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      style={{ height: 'var(--bb-topbar-height,56px)', boxShadow: 'var(--bb-elevation-subtle)' }}
    >
      <div className="mx-auto flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-gray-600 shadow-sm hover:bg-neutral-50 lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden flex-col lg:flex">
            <p className="text-[color:var(--bb-color-text-primary,#0f172a)] text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-semibold,600)] leading-[var(--bb-leading-tight,1.15)]">
              {tenantName}
            </p>
            {tenant?.plan ? (
              <p className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-xs,0.875rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide">
                {tenant.plan}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-transparent bg-white px-3 py-1 shadow-sm">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                isRealtimeConnected ? 'bg-emerald-500' : 'bg-rose-500',
              )}
            />
            <span className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-xs,0.875rem)] font-[var(--bb-font-weight-medium,500)]">
              {isRealtimeConnected ? 'Realtime' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-[color:var(--bb-color-text-primary,#0f172a)] text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-medium,500)] leading-[var(--bb-leading-tight,1.15)]">
              {user?.fullName || user?.name}
            </p>
            {userEmail ? (
              <p className="text-[color:var(--bb-color-text-muted,#52525b)] text-[var(--bb-font-size-xs,0.875rem)] leading-[var(--bb-leading-normal,1.35)]">
                {userEmail}
              </p>
            ) : null}
          </div>
          <Avatar size="sm" src={user?.avatarUrl} fallback={initials} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;

