import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck2,
  PawPrint,
  Users,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/lib/acl';

const baseItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/bookings',
    label: 'Bookings',
    icon: CalendarCheck2,
  },
  {
    to: '/pets',
    label: 'Pets',
    icon: PawPrint,
  },
  {
    to: '/owners',
    label: 'Owners',
    icon: Users,
  },
  {
    to: '/payments',
    label: 'Payments',
    icon: CreditCard,
    permission: 'viewPayments',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    permission: 'viewReports',
  },
  {
    to: '/staff',
    label: 'Staff',
    icon: ShieldCheck,
    permission: 'manageStaff',
  },
  {
    to: '/tenants',
    label: 'Tenant Admin',
    icon: Building2,
    permission: 'manageTenant',
  },
];

const Sidebar = ({ collapsed, isMobile = false, onNavigate }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);
  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };
  const terminology = tenant?.terminology ?? {};
  const navItems = baseItems
    .filter((item) => !item.permission || can(permissionContext, item.permission))
    .map((item) => ({
      ...item,
      label: terminology[item.label.toLowerCase()] || terminology[item.label] || item.label,
    }));

  return (
    <aside
      className={cn(
        'border-r border-border/80 bg-surface/98 transition-all duration-200',
        isMobile
          ? 'flex w-64 flex-col'
          : collapsed
            ? 'hidden w-[var(--sidebar-width-collapsed)] flex-col lg:flex'
            : 'hidden w-[var(--sidebar-width)] flex-col lg:flex',
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {tenant?.assets?.logo ? (
            <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="text-lg font-bold">BB</span>
          )}
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-text">{tenant?.name ?? 'BarkBase'}</p>
            <span className="text-xs text-muted">{tenant?.plan ?? 'FREE'}</span>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary',
                isActive && 'bg-primary/15 text-primary',
                collapsed && !isMobile && 'justify-center',
              )
            }
            end={to === '/'}
          >
            <Icon className="h-5 w-5" />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border/60 px-5 py-4 text-xs text-muted">
        <p>Version {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</p>
        {tenant?.customDomain && <p className="truncate">Domain: {tenant.customDomain}</p>}
      </div>
    </aside>
  );
};

export default Sidebar;
