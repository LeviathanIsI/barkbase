import { useState } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import { 
  User, Building, Database, Bell, CreditCard, Users, Shield, Tag, Plug,
  ChevronRight, ChevronDown, ArrowLeft, Menu, X
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_SECTIONS = [
  {
    id: "personal",
    title: "Personal",
    items: [
      { id: 'profile', label: 'Profile', icon: User, path: '/settings/profile', description: 'Manage your personal account and preferences' },
    ],
  },
  {
    id: "business",
    title: "Business",
    items: [
      { id: 'business', label: 'Business', icon: Building, path: '/settings/business', description: 'Company information and branding' },
      { id: 'team', label: 'Team', icon: Users, path: '/settings/team', description: 'Manage staff and permissions' },
      { id: 'facility', label: 'Facility', icon: Building, path: '/settings/facility', description: 'Kennels, locations, and inventory' },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { id: 'services', label: 'Services & Pricing', icon: Tag, path: '/settings/services', description: 'Manage services, pricing, and packages' },
      { id: 'billing', label: 'Billing', icon: CreditCard, path: '/settings/billing', description: 'Subscription and payment settings' },
    ],
  },
  {
    id: "system",
    title: "System",
    items: [
      { id: 'data', label: 'Data', icon: Database, path: '/settings/properties', description: 'Custom fields and data management' },
      { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications', description: 'Email and communication preferences' },
      { id: 'security', label: 'Security', icon: Shield, path: '/settings/security', description: 'Security and access controls' },
      { id: 'integrations', label: 'Integrations', icon: Plug, path: '/settings/integrations', description: 'Connect third-party apps and services' },
    ],
  },
];

// Flatten for easy lookup
const ALL_ITEMS = NAV_SECTIONS.flatMap(section => section.items);

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getActiveItem = () => {
    const currentPath = location.pathname;

    // Handle special cases
    if (currentPath === '/settings/members') {
      return ALL_ITEMS.find(item => item.id === 'team');
    }

    // Handle facility sub-routes
    if (currentPath.startsWith('/settings/facility')) {
      return ALL_ITEMS.find(item => item.id === 'facility');
    }

    const activeItem = ALL_ITEMS.find(item => currentPath.startsWith(item.path));
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
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </div>
              <div className="space-y-0.5">
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
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground/70"
                        )} />
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 opacity-0 transition-opacity",
                        isActive ? "opacity-100" : "group-hover:opacity-60"
                      )} />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex w-full min-h-screen bg-background">
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
          className="mt-2 w-full flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            {activeItem && <activeItem.icon className="h-4 w-4 text-primary" />}
            <span className="font-medium">{activeItem?.label}</span>
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
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
      <div className="flex-1 flex justify-center md:pt-0 pt-24">
        <div className="w-full max-w-4xl p-6 md:p-8">
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
