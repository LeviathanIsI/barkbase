import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Grid3x3,
  Calendar,
  LogIn,
  BookOpen,
  BarChart3,
  DollarSign,
  Gift,
  CheckCircle,
  FileText,
  CreditCard,
  Users,
  PawPrint,
  Shield,
  Clock,
  Building,
  Tag,
  Plug,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  User,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

// Jumbo Navigation Structure for BarkBase
const navigationSections = [
  {
    title: 'MAIN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Grid3x3 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    title: 'INTAKE',
    items: [
      { to: '/calendar', label: "Today's Schedule", icon: Calendar },
      { to: '/tasks', label: 'Tasks & Reminders', icon: CheckCircle },
      { to: '/bookings', label: 'Bookings', icon: BookOpen },
      { to: '/facilities', label: 'Capacity View', icon: BarChart3 },
    ],
  },
  {
    title: 'CLIENTS',
    items: [
      { to: '/owners', label: 'Pet Owners', icon: Users },
      { to: '/pets', label: 'Pets', icon: PawPrint },
      { to: '/feeding-meds', label: 'Vaccinations', icon: Shield },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/payments', label: 'Payments', icon: DollarSign },
      { to: '/packages', label: 'Packages', icon: Gift },
    ],
  },
  {
    title: 'STAFF',
    items: [
      { to: '/staff', label: 'Team', icon: Users },
      { to: '/runs', label: 'Schedule', icon: Clock },
    ],
  },
];

const JumboSidebar = ({ collapsed, isMobile = false, onNavigate }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState(() => {
    // Initialize with first section expanded
    const initial = {};
    navigationSections.forEach((section, index) => {
      initial[section.title] = index === 0; // Expand first section by default
    });
    return initial;
  });

  // Restore expanded sections from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`jumbo-sidebar-sections-${tenant?.slug}`);
    if (stored) {
      setExpandedSections(JSON.parse(stored));
    }
  }, [tenant?.slug]);

  const toggleSection = useCallback((sectionTitle) => {
    if (collapsed && !isMobile) return;

    setExpandedSections(prev => {
      const newState = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      if (tenant?.slug) {
        localStorage.setItem(`jumbo-sidebar-sections-${tenant.slug}`, JSON.stringify(newState));
      }
      return newState;
    });
  }, [tenant?.slug, collapsed, isMobile]);

  // Close expanded sections when sidebar is collapsed
  useEffect(() => {
    if (collapsed && !isMobile) {
      setExpandedSections({});
    }
  }, [collapsed, isMobile]);

  const isItemActive = (item) => {
    return location.pathname.startsWith(item.to);
  };

  const isSectionActive = (section) => {
    return section.items.some(item => location.pathname.startsWith(item.to));
  };

  return (
    <aside
      className={cn(
        'bg-[#1E1E2D] text-white transition-all duration-200 shadow-lg',
        !isMobile && 'lg:sticky lg:top-0 lg:h-screen lg:self-start',
        isMobile
          ? 'flex w-64 flex-col'
          : collapsed
            ? 'hidden w-[var(--sidebar-width-collapsed)] flex-col lg:flex'
            : 'hidden w-[var(--sidebar-width)] flex-col lg:flex',
      )}
      style={{
        '--sidebar-width': '260px',
        '--sidebar-width-collapsed': '80px',
      }}
    >
      {/* Logo/Brand Section */}
      <div className={cn(
        "flex items-center border-b border-white/10 py-6 transition-all",
        collapsed && !isMobile ? "justify-center px-2" : "justify-between gap-3 px-6"
      )}>
        {collapsed && !isMobile ? (
          // Collapsed state - just show logo/icon
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4B5DD3]/20 text-[#4B5DD3]">
              {tenant?.assets?.logo ? (
                <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <span className="text-lg font-bold">BB</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Expanded state - show logo, name, and collapse button
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#4B5DD3]/20 text-[#4B5DD3]">
                {tenant?.assets?.logo ? (
                  <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="text-lg font-bold">BB</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{tenant?.name ?? 'BarkBase'}</p>
                <span className="text-xs text-white/70">{tenant?.plan ?? 'FREE'}</span>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* User Profile Section */}
      {(!collapsed || isMobile) && (
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4B5DD3] text-white text-sm font-semibold">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Guest User'}</p>
              <p className="text-xs text-white/70">{role ?? 'OWNER'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationSections.map((section) => {
          const isExpanded = expandedSections[section.title];
          const sectionActive = isSectionActive(section);

          return (
            <div key={section.title} className="mb-6">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                  sectionActive ? 'text-[#4B5DD3]' : 'text-white/60 hover:text-white',
                  collapsed && !isMobile && 'justify-center',
                )}
                aria-expanded={isExpanded}
              >
                {(!collapsed || isMobile) && (
                  <>
                    <span className="flex-1 text-left">{section.title}</span>
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform',
                        isExpanded && 'rotate-90',
                      )}
                    />
                  </>
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (!collapsed || isMobile) && (
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isItemActive(item);

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={() =>
                          cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            active
                              ? 'bg-[#4B5DD3] text-white shadow-md border-l-4 border-l-[#4B5DD3]'
                              : 'text-white/80 hover:bg-white/10 hover:text-white',
                            collapsed && !isMobile && 'justify-center px-2',
                          )
                        }
                      >
                        <ItemIcon className="h-5 w-5 flex-shrink-0" />
                        {(!collapsed || isMobile) && <span>{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-white/60">Version {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</p>
        {tenant?.customDomain && <p className="text-xs text-white/60 truncate">Domain: {tenant.customDomain}</p>}
      </div>
    </aside>
  );
};

export default JumboSidebar;
