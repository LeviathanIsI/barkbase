import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, WifiOff, Wifi, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/cn';
import { can } from '@/lib/acl';

const Header = ({ onMenuToggle }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const offline = useUIStore((state) => state.offline);
  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/70 bg-surface/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{tenant?.customDomain ?? tenant?.slug}</p>
          <h1 className="text-lg font-semibold text-text">{tenant?.name ?? 'BarkBase'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="neutral" className="uppercase">
            {tenant?.plan ?? 'FREE'}
          </Badge>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted',
              offline && 'border-warning/60 bg-warning/10 text-warning',
            )}
          >
            {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            {offline ? 'Offline' : 'Online'}
          </span>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-left text-xs hover:bg-surface"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30 text-sm font-semibold text-primary">
                {user?.name ? user.name[0] : 'BB'}
              </div>
              <div className="hidden lg:block">
                <p className="font-semibold text-text">{user?.name ?? 'Guest User'}</p>
                <p className="text-muted">{role ?? 'OWNER'}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
                {can(permissionContext, 'manageMembers') ? (
                  <Link
                    to="/settings/members"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Members
                  </Link>
                ) : null}
                {can(permissionContext, 'manageBilling') ? (
                  <Link
                    to="/settings/billing"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Billing
                  </Link>
                ) : null}
                {can(permissionContext, 'viewAuditLog') ? (
                  <Link
                    to="/settings/audit-log"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Audit Log
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
