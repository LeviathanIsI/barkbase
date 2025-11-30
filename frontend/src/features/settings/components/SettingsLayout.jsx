import { useState } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import {
  User, Building, Database, Bell, CreditCard, Users, Shield, Tag, Plug,
  ChevronRight, ChevronDown, ArrowLeft, Menu, X, Calendar, Mail, FileText,
  Settings, Palette, Globe, ToggleLeft, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/cn";
import Badge from "@/components/ui/Badge";

const NAV_SECTIONS = [
  {
    id: "personal",
    title: "Your Preferences",
    items: [
      { id: 'profile', label: 'Profile', icon: User, path: '/settings/profile', description: 'Manage your personal account' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications', description: 'Email and alert preferences' },
      { id: 'security', label: 'Security', icon: Shield, path: '/settings/security', description: 'Password and login settings' },
    ],
  },
  {
    id: "account",
    title: "Account Management",
    items: [
      { id: 'account', label: 'Account Defaults', icon: Settings, path: '/settings/account', description: 'Business info and operating hours' },
      { id: 'team', label: 'Users & Teams', icon: Users, path: '/settings/team', description: 'Manage staff and permissions' },
      { id: 'integrations', label: 'Integrations', icon: Plug, path: '/settings/integrations', description: 'Third-party connections' },
      { id: 'branding', label: 'Branding', icon: Palette, path: '/settings/branding', description: 'Logo and brand colors' },
      { id: 'domain', label: 'Domain & SSL', icon: Globe, path: '/settings/domain', description: 'Custom domain settings' },
      { id: 'features', label: 'Feature Toggles', icon: ToggleLeft, path: '/settings/feature-toggles', description: 'Enable or disable features' },
    ],
  },
  {
    id: "facility",
    title: "Facility & Services",
    items: [
      { id: 'facility', label: 'Facility Setup', icon: Building, path: '/settings/facility', description: 'Locations and accommodations' },
      { id: 'services', label: 'Services & Pricing', icon: Tag, path: '/settings/services', description: 'Service offerings and rates' },
      { id: 'online-booking', label: 'Online Booking', icon: Calendar, path: '/settings/online-booking', description: 'Customer booking portal' },
    ],
  },
  {
    id: "scheduling",
    title: "Scheduling",
    items: [
      { id: 'calendar', label: 'Calendar Settings', icon: Calendar, path: '/settings/calendar-settings', description: 'Calendar display options' },
      { id: 'booking-rules', label: 'Booking Rules', icon: ClipboardList, path: '/settings/booking-config', description: 'Booking policies and limits' },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    items: [
      { id: 'subscription', label: 'Subscription', icon: CreditCard, path: '/settings/billing', description: 'Your plan and usage' },
      { id: 'payment-processing', label: 'Payment Processing', icon: CreditCard, path: '/settings/payment-processing', description: 'Payment gateway settings' },
      { id: 'invoicing', label: 'Invoicing', icon: FileText, path: '/settings/invoicing', description: 'Invoice templates and settings' },
      { id: 'products', label: 'Products & Packages', icon: Tag, path: '/settings/products-services', description: 'Packages and add-ons' },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    items: [
      { id: 'email', label: 'Email Templates', icon: Mail, path: '/settings/email', description: 'Customize email content' },
      { id: 'sms', label: 'SMS Settings', icon: Bell, path: '/settings/sms', description: 'Text message configuration' },
      { id: 'triggers', label: 'Notification Triggers', icon: Bell, path: '/settings/communication-notifications', description: 'Automated alerts' },
    ],
  },
  {
    id: "data",
    title: "Data Management",
    items: [
      { id: 'properties', label: 'Properties', icon: Database, path: '/settings/properties', description: 'Custom fields and attributes' },
      { id: 'forms', label: 'Forms', icon: FileText, path: '/settings/forms', description: 'Intake and custom forms' },
      { id: 'documents', label: 'Documents', icon: FileText, path: '/settings/documents', description: 'File templates and storage' },
      { id: 'import-export', label: 'Import & Export', icon: Database, path: '/settings/import-export', description: 'Data migration tools' },
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    items: [
      { id: 'audit', label: 'Audit Log', icon: FileText, path: '/settings/audit-log', description: 'Activity history' },
      { id: 'privacy', label: 'Privacy Settings', icon: Shield, path: '/settings/privacy', description: 'Data privacy controls' },
      { id: 'terms', label: 'Terms & Policies', icon: FileText, path: '/settings/terms-policies', description: 'Legal documents' },
    ],
  },
];

// Flatten for easy lookup
const ALL_ITEMS = NAV_SECTIONS.flatMap(section => section.items);

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getActiveItem = () => {
    const currentPath = location.pathname;

    // Handle special cases - redirect paths
    if (currentPath === '/settings/members') {
      return ALL_ITEMS.find(item => item.id === 'team');
    }
    if (currentPath === '/settings/business') {
      return ALL_ITEMS.find(item => item.id === 'account');
    }

    // Handle sub-routes
    if (currentPath.startsWith('/settings/facility')) {
      return ALL_ITEMS.find(item => item.id === 'facility');
    }
    if (currentPath.startsWith('/settings/team')) {
      return ALL_ITEMS.find(item => item.id === 'team');
    }
    if (currentPath.startsWith('/settings/objects')) {
      return ALL_ITEMS.find(item => item.id === 'properties');
    }

    // Find exact or prefix match
    const activeItem = ALL_ITEMS.find(item => currentPath === item.path || currentPath.startsWith(item.path + '/'));
    return activeItem || ALL_ITEMS[0];
  };

  const activeItem = getActiveItem();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to App
        </button>
      </div>

      {/* Title */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {NAV_SECTIONS.map((section) => {
            const isCollapsed = collapsedSections[section.id];
            const hasActiveItem = section.items.some(item => activeItem?.id === item.id);

            return (
              <div key={section.id}>
                {/* Collapsible Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  <span>{section.title}</span>
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-transform",
                    isCollapsed && "-rotate-90"
                  )} />
                </button>

                {/* Section Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mb-3">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeItem?.id === item.id;

                      return (
                        <NavLink
                          key={item.id}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "text-primary-500 bg-transparent"
                              : "text-white hover:text-primary-400"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isActive ? "text-primary-500" : "text-white/70 group-hover:text-primary-400"
                            )} />
                            <span>{item.label}</span>
                          </span>
                          <ChevronRight className={cn(
                            "h-3.5 w-3.5 transition-opacity",
                            isActive ? "opacity-100 text-primary-500" : "opacity-0 group-hover:opacity-60"
                          )} />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex w-full bg-background rounded-lg border border-border overflow-hidden" style={{ minHeight: '70vh' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-border bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-sm font-semibold text-foreground">Settings</h1>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        
        {/* Current section indicator */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mt-2 w-full flex items-center justify-between rounded-md bg-primary-600 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2 text-white">
            {activeItem && <activeItem.icon className="h-4 w-4 text-white" />}
            <span className="font-medium">{activeItem?.label}</span>
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-white/70 transition-transform",
            mobileMenuOpen && "rotate-180"
          )} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-200",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pt-0 pt-24">
        <div className="w-full p-6 md:p-8">
          {/* Page Title */}
          {activeItem && (
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground">
                {activeItem.label}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeItem.description}
              </p>
            </div>
          )}

          {/* Content Card */}
          <div className="bg-card rounded-lg border border-border shadow-sm">
            <div className="p-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
