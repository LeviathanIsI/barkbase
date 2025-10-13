import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck2,
  Calendar,
  Home,
  Pill,
  UserCheck,
  PawPrint,
  Users,
  Building2,
  Sparkles,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  DollarSign,
  Workflow,
  Mail,
  Webhook,
  Code,
  TicketIcon,
  BookOpen,
  FileSearch,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { can } from '@/lib/acl';
import { useNavBucketTracking } from '@/hooks/useTelemetry';

// Navigation structure with buckets
const navigationBuckets = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'kennel',
    label: 'Kennel',
    icon: CalendarCheck2,
    items: [
      { to: '/bookings', label: 'Reservations', icon: CalendarCheck2 },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
      { to: '/runs', label: 'Run Assignment', icon: Home },
      { to: '/feeding-meds', label: 'Feeding & Meds', icon: Pill },
      { to: '/daycare/checkin', label: 'Daycare Check-in', icon: UserCheck },
    ],
  },
  {
    id: 'pack',
    label: 'The Pack',
    icon: PawPrint,
    items: [
      { to: '/pets', label: 'Pets', icon: PawPrint },
      { to: '/owners', label: 'Owners', icon: Users },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: CreditCard,
    items: [
      { to: '/invoices', label: 'Invoices', icon: FileText },
      { to: '/payments', label: 'Payments', icon: CreditCard, permission: 'viewPayments' },
      { to: '/reports', label: 'Insights', icon: BarChart3, permission: 'viewReports' },
      { to: '/pricing-rules', label: 'Pricing', icon: DollarSign },
    ],
  },
  {
    id: 'handlers',
    label: 'Handlers',
    icon: Workflow,
    items: [
      { to: '/handler-flows', label: 'Flows', icon: Workflow, permission: 'manageTenant' },
      { to: '/automations/follow-ups', label: 'Follow-ups', icon: Mail, featureFlag: 'sequences' },
      { to: '/automations/webhooks', label: 'Webhooks', icon: Webhook },
      { to: '/automations/custom-code', label: 'Custom Code', icon: Code, featureFlag: 'customCode' },
    ],
  },
  {
    id: 'helpdesk',
    label: 'Help Desk',
    icon: TicketIcon,
    items: [
      { to: '/support/tickets', label: 'Tickets', icon: TicketIcon },
      { to: '/support/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
      { to: '/support/logs', label: 'Activity Logs', icon: FileSearch },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    items: [
      { to: '/settings/general', label: 'General', icon: SettingsIcon },
      { to: '/settings/team', label: 'Team', icon: Users, permission: 'manageTenant' },
      { to: '/settings/branding', label: 'Branding', icon: Sparkles },
      { to: '/settings/integrations', label: 'Integrations', icon: Webhook },
    ],
  },
];

const BucketedSidebar = ({ collapsed, isMobile = false, onNavigate }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const location = useLocation();
  const [openBucket, setOpenBucket] = useState(null);
  const [openGroups, setOpenGroups] = useState({});
  const trackNavBucket = useNavBucketTracking();

  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features || {},
    featureFlags: tenant?.featureFlags || {},
  };

  // Restore last open bucket from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`barkbase-sidebar-bucket-${tenant?.slug}`);
    if (stored) {
      setOpenBucket(stored);
    }
  }, [tenant?.slug]);

  const toggleBucket = useCallback((bucketId) => {
    // Don't toggle buckets if sidebar is collapsed (unless mobile)
    if (collapsed && !isMobile) return;

    setOpenBucket((prev) => {
      const newState = prev === bucketId ? null : bucketId;
      trackNavBucket(bucketId, newState !== null);
      if (newState && tenant?.slug) {
        localStorage.setItem(`barkbase-sidebar-bucket-${tenant.slug}`, bucketId);
      }
      return newState;
    });
  }, [tenant?.slug, trackNavBucket, collapsed, isMobile]);

  // Close open buckets when sidebar is collapsed
  useEffect(() => {
    if (collapsed && !isMobile) {
      setOpenBucket(null);
    }
  }, [collapsed, isMobile]);

  // Filter items based on permissions and feature flags
  const canViewItem = useCallback((item) => {
    // Check permission
    if (item.permission && !can(permissionContext, item.permission)) {
      return false;
    }
    // Check feature flag
    if (item.featureFlag && !permissionContext.features[item.featureFlag]) {
      return false;
    }
    return true;
  }, [permissionContext]);

  // Filter buckets (hide if all children are hidden)
  const visibleBuckets = navigationBuckets.map((bucket) => ({
    ...bucket,
    items: bucket.items.filter(canViewItem),
  })).filter((bucket) => bucket.items.length > 0);

  // Handle keyboard navigation
  const handleKeyDown = (e, bucketId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleBucket(bucketId);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setOpenBucket(bucketId);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setOpenBucket(null);
    }
  };

  return (
    <aside
      className={cn(
        'border-r border-border/80 bg-surface/98 transition-all duration-200',
        !isMobile && 'lg:sticky lg:top-0 lg:h-screen lg:self-start',
        isMobile
          ? 'flex w-64 flex-col'
          : collapsed
            ? 'hidden w-[var(--sidebar-width-collapsed)] flex-col lg:flex'
            : 'hidden w-[var(--sidebar-width)] flex-col lg:flex',
      )}
    >
      {/* Logo/Brand */}
      <div className={cn(
        "flex items-center border-b border-border/60 py-4 transition-all",
        collapsed && !isMobile ? "justify-center px-2" : "justify-between gap-3 px-5"
      )}>
        {collapsed && !isMobile ? (
          // Collapsed state - just show the logo/icon centered
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              {tenant?.assets?.logo ? (
                <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <span className="text-lg font-bold">BB</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
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
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {tenant?.assets?.logo ? (
                  <img src={tenant.assets.logo} alt={`${tenant.name} logo`} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="text-lg font-bold">BB</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text truncate">{tenant?.name ?? 'BarkBase'}</p>
                <span className="text-xs text-muted">{tenant?.plan ?? 'FREE'}</span>
              </div>
            </div>
            {!isMobile && (
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleBuckets.map((bucket) => {
          const isOpen = openBucket === bucket.id;
          const isActive = bucket.items.some((item) => location.pathname.startsWith(item.to));
          const BucketIcon = bucket.icon;

          // If bucket has only one item, render it directly without flyout
          if (bucket.items.length === 1 && bucket.id === 'home') {
            const item = bucket.items[0];
            const ItemIcon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary mb-1',
                    isActive && 'bg-primary/15 text-primary',
                    collapsed && !isMobile && 'justify-center',
                  )
                }
              >
                <ItemIcon className="h-5 w-5 flex-shrink-0" />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            );
          }

          return (
            <div key={bucket.id} className="mb-1">
              {/* Bucket Header */}
              <button
                onClick={() => toggleBucket(bucket.id)}
                onKeyDown={(e) => handleKeyDown(e, bucket.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10',
                  isActive ? 'text-primary' : 'text-muted hover:text-primary',
                  collapsed && !isMobile && 'justify-center',
                )}
                aria-expanded={isOpen}
                aria-label={`Toggle ${bucket.label} menu`}
              >
                <BucketIcon className="h-5 w-5 flex-shrink-0" />
                {(!collapsed || isMobile) && (
                  <>
                    <span className="flex-1 text-left">{bucket.label}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </>
                )}
              </button>

              {/* Bucket Items (Flyout) */}
              {isOpen && (!collapsed || isMobile) && (
                <div className="ml-8 mt-1 space-y-1 border-l border-border/40 pl-3">
                  {bucket.items.map((item, itemIndex) => {
                    const ItemIcon = item.icon;

                    // Handle nested groups (e.g., Objects submenu)
                    if (item.isGroup && item.children) {
                      const groupKey = `${bucket.id}-${item.label}`;
                      const groupOpen = openGroups[groupKey] || false;

                      const toggleGroup = () => {
                        setOpenGroups(prev => ({
                          ...prev,
                          [groupKey]: !prev[groupKey],
                        }));
                      };

                      return (
                        <div key={`group-${itemIndex}`}>
                          <button
                            onClick={toggleGroup}
                            className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <ItemIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronRight
                              className={cn(
                                'h-3 w-3 transition-transform',
                                groupOpen && 'rotate-90',
                              )}
                            />
                          </button>

                          {groupOpen && (
                            <div className="ml-6 mt-1 space-y-1 border-l border-border/30 pl-3">
                              {item.children.filter(canViewItem).map((child) => {
                                const ChildIcon = child.icon;
                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                      cn(
                                        'group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary',
                                        isActive && 'bg-primary/15 text-primary',
                                      )
                                    }
                                  >
                                    <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{child.label}</span>
                                  </NavLink>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Regular item
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary',
                            isActive && 'bg-primary/15 text-primary',
                          )
                        }
                      >
                        <ItemIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{item.label}</span>
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
      <div className="border-t border-border/60 px-5 py-4 text-xs text-muted">
        <p>Version {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</p>
        {tenant?.customDomain && <p className="truncate">Domain: {tenant.customDomain}</p>}
      </div>
    </aside>
  );
};

export default BucketedSidebar;
