import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  Circle,
  CreditCard,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  MessageSquare,
  PanelsTopLeft,
  PawPrint,
  Settings,
  Syringe,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { sidebarSections } from '@/config/navigation';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/utils';

const iconMap = {
  '/today': LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  '/dashboard': Home,
  home: Home,
  '/pets-people': Users,
  users: Users,
  '/pets': PawPrint,
  'paw-print': PawPrint,
  '/owners': UserRound,
  'user-round': UserRound,
  '/vaccinations': Syringe,
  syringe: Syringe,
  '/segments': Layers,
  layers: Layers,
  '/bookings': CalendarPlus,
  'calendar-plus': CalendarPlus,
  '/schedule': CalendarDays,
  'calendar-days': CalendarDays,
  '/calendar': Calendar,
  calendar: Calendar,
  '/runs': Activity,
  activity: Activity,
  '/tasks': CheckSquare,
  'check-square': CheckSquare,
  '/kennels': Home,
  '/operations': PanelsTopLeft,
  'panels-top-left': PanelsTopLeft,
  '/messages': MessageSquare,
  'message-square': MessageSquare,
  '/payments': CreditCard,
  'credit-card': CreditCard,
  '/invoices': FileText,
  'file-text': FileText,
  '/reports': BarChart3,
  'bar-chart-3': BarChart3,
  '/staff': UserCog,
  'user-cog': UserCog,
  '/tenants': Building2,
  'building-2': Building2,
  '/settings': Settings,
  settings: Settings,
};

const SidebarSection = ({ onNavigate }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const tenantName = tenant?.name ?? tenant?.slug ?? 'BarkBase';
  const tenantPlan = tenant?.plan;

  return (
    <div className="flex h-full flex-col border-r border-[color:var(--bb-color-sidebar-border,#d1d5db)] bg-[color:var(--bb-color-sidebar-bg,#e5e7eb)]">
      <div className="flex items-center gap-3 rounded-lg border border-transparent px-[var(--bb-space-4,1rem)] py-[var(--bb-space-6,1.5rem)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-semibold text-white shadow-sm">
          {tenantName
            .split(' ')
            .slice(0, 2)
            .map((chunk) => chunk.charAt(0))
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--bb-color-sidebar-text-primary,#111827)]">
            {tenantName}
          </p>
          {tenantPlan ? (
            <p className="text-xs uppercase text-[color:var(--bb-color-sidebar-text-muted,#6b7280)]">{tenantPlan}</p>
          ) : null}
        </div>
      </div>

      <nav className="mt-[var(--bb-space-4,1rem)] flex-1 space-y-[var(--bb-space-6,1.5rem)] overflow-y-auto px-[var(--bb-space-3,0.75rem)] pb-[var(--bb-space-6,1.5rem)]">
        {sidebarSections.map((section) => (
          <div key={section.id}>
            <p className="px-1 text-[var(--bb-font-size-xs,0.875rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-sidebar-text-muted,#6b7280)]">
              {section.label}
            </p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon ?? item.path] ?? Circle;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,1rem)] font-[var(--bb-font-weight-medium,500)] text-[color:var(--bb-color-sidebar-text-primary,#111827)] transition-colors',
                        'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg,rgba(79,70,229,0.08))]',
                        isActive &&
                          'bg-[color:var(--bb-color-sidebar-item-active-bg,rgba(79,70,229,0.16))] text-[color:var(--bb-color-sidebar-item-active-text,#4f46e5)] font-[var(--bb-font-weight-semibold,600)] shadow-sm',
                      )
                    }
                    onClick={onNavigate}
                    end={item.path === '/today'}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[color:var(--bb-color-sidebar-text-muted,#6b7280)] transition-colors group-hover:text-[color:var(--bb-color-sidebar-text-primary,#111827)]" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
};

const Sidebar = ({ variant = 'desktop', onNavigate }) => {
  if (variant === 'mobile') {
    return (
      <div className="relative h-full w-[280px] bg-white shadow-2xl ring-1 ring-black/5">
        <button
          type="button"
          onClick={onNavigate}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarSection onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 hidden h-screen w-[var(--bb-sidebar-width,240px)] flex-col border-r border-neutral-200 bg-white/95 px-0 shadow-sm lg:flex"
      style={{ boxShadow: 'var(--bb-elevation-subtle)' }}
    >
      <SidebarSection />
    </aside>
  );
};

export default Sidebar;

