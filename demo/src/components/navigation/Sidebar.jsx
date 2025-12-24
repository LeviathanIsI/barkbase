/**
 * Demo Sidebar Component
 * Simplified sidebar navigation for demo mode.
 * Always shows the demo tenant info.
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  ChevronDown,
  Circle,
  CreditCard,
  FileText,
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
import { sidebarSections } from '@/config/navigation';
import { useTenantStore } from '@/stores/tenant';
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
  '/workflows': GitBranch,
  'git-branch': GitBranch,
  '/reports': BarChart3,
  'bar-chart-3': BarChart3,
  '/staff': UserCog,
  'user-cog': UserCog,
  '/tenants': Building2,
  'building-2': Building2,
  '/settings': Settings,
  settings: Settings,
};

const CollapsibleSection = ({ section, onNavigate, isExpanded, onToggle }) => {
  const canCollapse = section.collapsible !== false;

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
                  'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)]',
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

const SidebarSection = ({ onNavigate }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const tenantName = tenant?.name ?? tenant?.slug ?? 'BarkBase';
  const tenantPlan = tenant?.plan;

  // Track expanded state for each section
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = {};
    sidebarSections.forEach((section) => {
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

  return (
    <div className="flex h-full flex-col">
      {/* Tenant header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--bb-color-sidebar-border)] px-[var(--bb-space-4,1rem)] py-[var(--bb-space-5,1.25rem)]">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold shadow-md"
          style={{ backgroundColor: 'var(--bb-color-accent)', color: 'var(--bb-color-text-on-accent)' }}
        >
          {tenantName
            .split(' ')
            .slice(0, 2)
            .map((chunk) => chunk.charAt(0))
            .join('')
            .toUpperCase()}
        </div>
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
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-4,1rem)]">
        <div className="space-y-[var(--bb-space-1,0.25rem)]">
          {sidebarSections.map((section, index) => (
            <div key={section.id}>
              {/* Separator between sections */}
              {index > 0 && (
                <div className="my-[var(--bb-space-3,0.75rem)] mx-[var(--bb-space-3,0.75rem)] border-t border-[color:var(--bb-color-sidebar-border)] opacity-50" />
              )}
              <CollapsibleSection
                section={section}
                onNavigate={onNavigate}
                isExpanded={expandedSections[section.id]}
                onToggle={() => toggleSection(section.id)}
              />
            </div>
          ))}
        </div>
      </nav>

      {/* Footer - version/help */}
      <div className="border-t border-[color:var(--bb-color-sidebar-border)] px-[var(--bb-space-4,1rem)] py-[var(--bb-space-3,0.75rem)]">
        <p className="text-[0.65rem] text-[color:var(--bb-color-sidebar-text-muted)] text-center">
          BarkBase Demo v1.0
        </p>
      </div>
    </div>
  );
};

const Sidebar = ({ variant = 'desktop', onNavigate }) => {
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
        <SidebarSection onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 hidden h-screen w-[var(--bb-sidebar-width,240px)] flex-col border-r lg:flex"
      style={{
        backgroundColor: 'var(--bb-color-sidebar-bg)',
        borderColor: 'var(--bb-color-sidebar-border)',
        color: 'var(--bb-color-sidebar-text-primary)',
      }}
    >
      <SidebarSection />
    </aside>
  );
};

export default Sidebar;
