import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  FileText,
  Gift,
  GitBranch,
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
import { getSidebarSections } from '@/config/navigation';
import { useTenantStore } from '@/stores/tenant';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/utils';

const iconMap = {
  '/today': LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  '/dashboard': Home,
  home: Home,
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
  '/packages': Gift,
  gift: Gift,
  '/workflows': GitBranch,
  'git-branch': GitBranch,
  '/incidents': AlertTriangle,
  'alert-triangle': AlertTriangle,
  '/reports': BarChart3,
  'bar-chart-3': BarChart3,
  '/staff': UserCog,
  'user-cog': UserCog,
  '/tenants': Building2,
  'building-2': Building2,
  '/settings': Settings,
  settings: Settings,
};

const CollapsibleSection = ({ section, onNavigate, isExpanded, onToggle, isSidebarCollapsed }) => {
  const canCollapse = section.collapsible !== false;

  // When sidebar is collapsed, always show items (no section headers)
  if (isSidebarCollapsed) {
    return (
      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = iconMap[item.icon ?? item.path] ?? Circle;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-center rounded-lg p-2',
                  'transition-all duration-150',
                  'text-[color:var(--bb-color-sidebar-text-primary)]',
                  'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-inset',
                  isActive
                    ? 'bg-[color:var(--bb-color-sidebar-item-active-bg)] text-[color:var(--bb-color-sidebar-item-active-text)] shadow-sm'
                    : ''
                )
              }
              onClick={onNavigate}
              end={item.path === '/today'}
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Section header */}
      <button
        type="button"
        onClick={() => canCollapse && onToggle()}
        className={cn(
          'flex w-full items-center justify-between px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
          'text-[0.7rem] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wider',
          'text-[color:var(--bb-color-sidebar-text-muted)]',
          'rounded-md transition-colors',
          canCollapse && 'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)] cursor-pointer',
          !canCollapse && 'cursor-default'
        )}
        aria-expanded={isExpanded}
        aria-label={`${section.label} section${canCollapse ? ', click to toggle' : ''}`}
      >
        <span>{section.label}</span>
        {canCollapse && (
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isExpanded ? 'rotate-0' : '-rotate-90'
            )}
          />
        )}
      </button>

      {/* Section items */}
      <div
        className={cn(
          'mt-1 space-y-0.5 overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {section.items.map((item) => {
          const Icon = iconMap[item.icon ?? item.path] ?? Circle;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
                  'text-[0.8125rem] font-[var(--bb-font-weight-medium,500)] transition-all duration-150',
                  'text-[color:var(--bb-color-sidebar-text-primary)]',
                  'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)] hover:text-[color:var(--bb-color-sidebar-item-hover-text,var(--bb-color-sidebar-text-primary))]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-inset',
                  isActive
                    ? 'bg-[color:var(--bb-color-sidebar-item-active-bg)] text-[color:var(--bb-color-sidebar-item-active-text)] font-[var(--bb-font-weight-semibold,600)] shadow-sm'
                    : 'hover:translate-x-0.5'
                )
              }
              onClick={onNavigate}
              end={item.path === '/today'}
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

const SidebarSection = ({ onNavigate, isCollapsed = false }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const terminology = tenant?.terminology || {};
  const tenantName = tenant?.name ?? tenant?.slug ?? 'BarkBase';
  const tenantPlan = tenant?.plan;

  // Get sidebar sections with dynamic labels based on terminology
  const sidebarSections = useMemo(() => getSidebarSections(terminology), [terminology]);

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    getSidebarSections({}).forEach((section) => {
      initial[section.id] = section.defaultExpanded !== false;
    });
    return initial;
  });

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const tenantInitials = tenantName
    .split(' ')
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Tenant header */}
      <div
        className={cn(
          'flex items-center border-b border-[color:var(--bb-color-sidebar-border)]',
          isCollapsed ? 'justify-center px-2 py-4' : 'gap-3 px-[var(--bb-space-4,1rem)] py-[var(--bb-space-5,1.25rem)]'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-xl font-semibold shadow-md',
            isCollapsed ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
          )}
          style={{ backgroundColor: 'var(--bb-color-accent)', color: 'var(--bb-color-text-on-accent)' }}
          title={isCollapsed ? tenantName : undefined}
        >
          {tenantInitials}
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-sidebar-text-primary)]">
              {tenantName}
            </p>
            {tenantPlan && (
              <p className="text-[0.7rem] uppercase tracking-wide text-[color:var(--bb-color-sidebar-text-muted)]">
                {tenantPlan}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation sections */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-[var(--bb-space-4,1rem)]',
        isCollapsed ? 'px-2' : 'px-[var(--bb-space-2,0.5rem)]'
      )}>
        <div className={cn(isCollapsed ? 'space-y-1' : 'space-y-[var(--bb-space-1,0.25rem)]')}>
          {sidebarSections.map((section, index) => (
            <div key={section.id}>
              {/* Separator between sections */}
              {index > 0 && (
                <div
                  className={cn(
                    'border-t border-[color:var(--bb-color-sidebar-border)] opacity-50',
                    isCollapsed ? 'my-2 mx-1' : 'my-[var(--bb-space-3,0.75rem)] mx-[var(--bb-space-3,0.75rem)]'
                  )}
                />
              )}
              <CollapsibleSection
                section={section}
                onNavigate={onNavigate}
                isExpanded={expandedSections[section.id]}
                onToggle={() => toggleSection(section.id)}
                isSidebarCollapsed={isCollapsed}
              />
            </div>
          ))}
        </div>
      </nav>

      {/* Footer with collapse toggle */}
      <div className={cn(
        'border-t border-[color:var(--bb-color-sidebar-border)]',
        isCollapsed ? 'px-2 py-3' : 'px-[var(--bb-space-4,1rem)] py-[var(--bb-space-3,0.75rem)]'
      )}>
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg p-2 transition-colors',
            'text-[color:var(--bb-color-sidebar-text-muted)]',
            'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)] hover:text-[color:var(--bb-color-sidebar-text-primary)]',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[0.75rem]">Collapse</span>
            </>
          )}
        </button>
        {!isCollapsed && (
          <p className="text-[0.65rem] text-[color:var(--bb-color-sidebar-text-muted)] text-center mt-2">
            BarkBase v1.0
          </p>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ variant = 'desktop', onNavigate }) => {
  const isCollapsed = useUIStore((state) => state.sidebarCollapsed);

  if (variant === 'mobile') {
    return (
      <div
        className="relative h-full w-[280px] border-l shadow-2xl"
        style={{
          backgroundColor: 'var(--bb-color-sidebar-bg)',
          borderColor: 'var(--bb-color-sidebar-border)',
          color: 'var(--bb-color-sidebar-text-primary)',
        }}
      >
        <button
          type="button"
          onClick={onNavigate}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[color:var(--bb-color-sidebar-text-muted)] transition-colors hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)] hover:text-[color:var(--bb-color-sidebar-text-primary)]"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarSection onNavigate={onNavigate} isCollapsed={false} />
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 hidden h-screen flex-col border-r lg:flex transition-all duration-300',
        isCollapsed ? 'w-[64px]' : 'w-[var(--bb-sidebar-width,240px)]'
      )}
      style={{
        backgroundColor: 'var(--bb-color-sidebar-bg)',
        borderColor: 'var(--bb-color-sidebar-border)',
        color: 'var(--bb-color-sidebar-text-primary)',
      }}
    >
      <SidebarSection isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
