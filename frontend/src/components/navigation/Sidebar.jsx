/**
 * =============================================================================
 * BarkBase Sidebar Navigation - Premium SaaS Design
 * =============================================================================
 *
 * Modern sidebar with:
 * - Strong active states with amber fill and glow
 * - Better section headers with visual hierarchy
 * - Smooth hover transitions
 * - Icon animations and color states
 * - Glassmorphism accents
 */

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
  Dog,
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

// ============================================================================
// ICON MAP
// ============================================================================
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

// ============================================================================
// NAV ITEM COMPONENT - Expanded State
// ============================================================================
const NavItem = ({ item, onNavigate }) => {
  const Icon = iconMap[item.icon ?? item.path] ?? Circle;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          // Base styles
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
          'text-[0.8125rem] font-medium',
          'transition-all duration-200 ease-out',

          // Focus styles
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bb-color-sidebar-bg)]',

          isActive
            ? // Active state - Premium amber fill with glow
              [
                'bg-gradient-to-r from-amber-500 to-amber-600',
                'text-white font-semibold',
                'shadow-[0_4px_15px_rgba(251,191,36,0.35)]',
              ]
            : // Default state
              [
                'text-[color:var(--bb-color-sidebar-text-secondary)]',
                'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)]',
                'hover:text-[color:var(--bb-color-sidebar-text-primary)]',
              ]
        )
      }
      onClick={onNavigate}
      end={item.path === '/today'}
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar for active state */}
          {isActive && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white/30"
              aria-hidden="true"
            />
          )}

          {/* Icon with background circle for active state */}
          <div
            className={cn(
              'relative flex items-center justify-center transition-all duration-200',
              isActive
                ? 'text-white'
                : 'text-[color:var(--bb-color-sidebar-icon-default,var(--bb-color-sidebar-text-muted))] group-hover:text-[color:var(--bb-color-sidebar-text-primary)]'
            )}
          >
            <Icon
              className={cn(
                'h-[18px] w-[18px] transition-transform duration-200',
                'group-hover:scale-110'
              )}
              strokeWidth={isActive ? 2.5 : 2}
            />
          </div>

          {/* Label */}
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

// ============================================================================
// NAV ITEM COMPONENT - Collapsed State (Icon Only)
// ============================================================================
const NavItemCollapsed = ({ item, onNavigate }) => {
  const Icon = iconMap[item.icon ?? item.path] ?? Circle;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          // Base styles
          'group relative flex items-center justify-center rounded-xl p-2.5',
          'transition-all duration-200 ease-out',

          // Focus styles
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] focus-visible:ring-inset',

          isActive
            ? // Active state
              [
                'bg-gradient-to-br from-amber-500 to-amber-600',
                'text-white',
                'shadow-[0_4px_12px_rgba(251,191,36,0.4)]',
              ]
            : // Default state
              [
                'text-[color:var(--bb-color-sidebar-icon-default,var(--bb-color-sidebar-text-muted))]',
                'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)]',
                'hover:text-[color:var(--bb-color-sidebar-text-primary)]',
              ]
        )
      }
      onClick={onNavigate}
      end={item.path === '/today'}
      title={item.label}
    >
      {({ isActive }) => (
        <Icon
          className={cn(
            'h-5 w-5 transition-transform duration-200',
            'group-hover:scale-110'
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
      )}
    </NavLink>
  );
};

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================
const CollapsibleSection = ({ section, onNavigate, isExpanded, onToggle, isSidebarCollapsed }) => {
  const canCollapse = section.collapsible !== false;

  // Collapsed sidebar - just render items without headers
  if (isSidebarCollapsed) {
    return (
      <div className="space-y-1 px-2">
        {section.items.map((item) => (
          <NavItemCollapsed key={item.path} item={item} onNavigate={onNavigate} />
        ))}
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
          'flex w-full items-center justify-between px-3 py-2',
          'text-[0.65rem] font-semibold uppercase tracking-widest',
          'text-[color:var(--bb-color-sidebar-section-text)]',
          'rounded-lg transition-all duration-200',
          canCollapse && 'hover:text-[color:var(--bb-color-sidebar-text-primary)] cursor-pointer',
          !canCollapse && 'cursor-default'
        )}
        aria-expanded={isExpanded}
        aria-label={`${section.label} section${canCollapse ? ', click to toggle' : ''}`}
      >
        <span className="flex items-center gap-2">
          {/* Decorative dot */}
          <span className="h-1 w-1 rounded-full bg-current opacity-60" />
          {section.label}
        </span>
        {canCollapse && (
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200 opacity-60',
              isExpanded ? 'rotate-0' : '-rotate-90'
            )}
          />
        )}
      </button>

      {/* Section items */}
      <div
        className={cn(
          'mt-1 space-y-0.5 overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {section.items.map((item) => (
          <NavItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// WORKSPACE HEADER COMPONENT
// ============================================================================
const WorkspaceHeader = ({ isCollapsed }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const tenantName = tenant?.name ?? tenant?.slug ?? 'BarkBase';
  const tenantPlan = tenant?.plan;

  const tenantInitials = tenantName
    .split(' ')
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0))
    .join('')
    .toUpperCase();

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center px-2 py-4 border-b border-[color:var(--bb-color-sidebar-border)]">
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-sm shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
          }}
          title={tenantName}
        >
          {/* Subtle glow */}
          <div
            className="absolute inset-0 rounded-xl blur-md opacity-40"
            style={{ background: 'var(--bb-color-accent)' }}
          />
          <span className="relative">{tenantInitials}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-5 border-b"
      style={{
        borderColor: 'var(--bb-color-sidebar-border)',
        background: 'var(--bb-color-sidebar-workspace-bg)',
      }}
    >
      {/* Logo/Avatar with glow */}
      <div className="relative">
        {/* Glow layer */}
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-30"
          style={{ background: 'var(--bb-color-accent)' }}
        />
        {/* Avatar */}
        <div
          className="relative flex h-11 w-11 items-center justify-center rounded-xl font-semibold text-sm shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
          }}
        >
          <Dog className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>

      {/* Workspace info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-semibold text-[color:var(--bb-color-sidebar-text-primary)]">
          {tenantName}
        </p>
        {tenantPlan && (
          <p className="text-[0.65rem] uppercase tracking-wider text-[color:var(--bb-color-sidebar-text-muted)] mt-0.5">
            {tenantPlan} Plan
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SIDEBAR SECTION (CONTENT) COMPONENT
// ============================================================================
const SidebarSection = ({ onNavigate, isCollapsed = false }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const terminology = tenant?.terminology || {};

  // Get sidebar sections with dynamic labels
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

  return (
    <div className="flex h-full flex-col">
      {/* Workspace header */}
      <WorkspaceHeader isCollapsed={isCollapsed} />

      {/* Navigation sections */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-4',
          isCollapsed ? 'px-1' : 'px-2'
        )}
      >
        <div className={cn(isCollapsed ? 'space-y-1' : 'space-y-1')}>
          {sidebarSections.map((section, index) => (
            <div key={section.id}>
              {/* Section divider */}
              {index > 0 && !isCollapsed && (
                <div className="my-4 mx-3 border-t border-[color:var(--bb-color-sidebar-section-border)] opacity-50" />
              )}
              {index > 0 && isCollapsed && (
                <div className="my-2 mx-2 border-t border-[color:var(--bb-color-sidebar-section-border)] opacity-30" />
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
      <div
        className={cn(
          'border-t',
          isCollapsed ? 'px-2 py-3' : 'px-4 py-3'
        )}
        style={{ borderColor: 'var(--bb-color-sidebar-border)' }}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2 w-full rounded-xl p-2.5',
            'text-[color:var(--bb-color-sidebar-text-muted)]',
            'transition-all duration-200',
            'hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)]',
            'hover:text-[color:var(--bb-color-sidebar-text-primary)]',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
        {!isCollapsed && (
          <p className="text-[0.6rem] text-[color:var(--bb-color-sidebar-text-muted)] text-center mt-2 opacity-60">
            BarkBase v1.0
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN SIDEBAR COMPONENT
// ============================================================================
const Sidebar = ({ variant = 'desktop', onNavigate }) => {
  const isCollapsed = useUIStore((state) => state.sidebarCollapsed);

  // Mobile variant
  if (variant === 'mobile') {
    return (
      <div
        className="relative h-full w-[280px] border-l shadow-2xl"
        style={{
          background: 'var(--bb-color-sidebar-gradient, var(--bb-color-sidebar-bg))',
          borderColor: 'var(--bb-color-sidebar-border)',
          color: 'var(--bb-color-sidebar-text-primary)',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onNavigate}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-[color:var(--bb-color-sidebar-text-muted)] transition-all duration-200 hover:bg-[color:var(--bb-color-sidebar-item-hover-bg)] hover:text-[color:var(--bb-color-sidebar-text-primary)]"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarSection onNavigate={onNavigate} isCollapsed={false} />
      </div>
    );
  }

  // Desktop variant
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 hidden h-screen flex-col border-r lg:flex',
        'transition-all duration-300 ease-out',
        isCollapsed ? 'w-[64px]' : 'w-[var(--bb-sidebar-width,240px)]'
      )}
      style={{
        background: 'var(--bb-color-sidebar-gradient, var(--bb-color-sidebar-bg))',
        borderColor: 'var(--bb-color-sidebar-border)',
        boxShadow: 'var(--bb-color-sidebar-shadow)',
        color: 'var(--bb-color-sidebar-text-primary)',
      }}
    >
      <SidebarSection isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
