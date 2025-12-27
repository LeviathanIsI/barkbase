import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
import {
  User,
  Building,
  Building2,
  Database,
  Bell,
  BellRing,
  CreditCard,
  Users,
  ShieldCheck,
  Tag,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  Menu,
  X,
  Calendar,
  Mail,
  MessageSquare,
  FileText,
  Palette,
  Globe,
  ClipboardList,
  ListTree,
  ArrowLeftRight,
  Landmark,
  Package,
  ScrollText,
  History,
  Type,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/ui";

const NAV_SECTIONS = [
  {
    id: "personal",
    title: "Your Preferences",
    items: [
      { id: "profile", label: "Profile", icon: User, path: "/settings/profile", description: "Manage your personal account" },
      { id: "notifications", label: "Notifications", icon: Bell, path: "/settings/notifications", description: "Email and alert preferences" },
    ],
  },
  {
    id: "business",
    title: "Business",
    items: [
      { id: "account", label: "Business Info", icon: Building2, path: "/settings/account", description: "Business info and operating hours" },
      { id: "team", label: "Users & Teams", icon: Users, path: "/settings/team", description: "Manage staff and permissions" },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    items: [
      { id: "branding", label: "Branding", icon: Palette, path: "/settings/branding", description: "Logo and brand colors" },
      { id: "terminology", label: "Terminology", icon: Type, path: "/settings/terminology", description: "Customize navigation labels" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { id: "facility", label: "Facility Setup", icon: Building, path: "/settings/facility", description: "Locations and accommodations" },
      { id: "services", label: "Services & Pricing", icon: Tag, path: "/settings/services", description: "Service offerings and rates" },
      { id: "booking-rules", label: "Booking Rules", icon: ClipboardList, path: "/settings/booking-config", description: "Booking policies and limits" },
      { id: "online-booking", label: "Online Booking", icon: Globe, path: "/settings/online-booking", description: "Customer booking portal" },
      { id: "calendar", label: "Calendar Settings", icon: Calendar, path: "/settings/calendar-settings", description: "Calendar display options" },
    ],
  },
  {
    id: "data",
    title: "Data",
    items: [
      {
        id: "custom-fields",
        label: "Custom Fields",
        icon: Database,
        expandable: true,
        description: "Configure custom fields per object",
        children: [
          { id: "objects-pets", label: "Pets", path: "/settings/objects/pets" },
          { id: "objects-owners", label: "Owners", path: "/settings/objects/owners" },
          { id: "objects-bookings", label: "Bookings", path: "/settings/objects/bookings" },
          { id: "objects-invoices", label: "Invoices", path: "/settings/objects/invoices" },
          { id: "objects-payments", label: "Payments", path: "/settings/objects/payments" },
        ],
      },
      { id: "import-export", label: "Import & Export", icon: ArrowLeftRight, path: "/settings/import-export", description: "Data migration tools" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    items: [
      { id: "subscription", label: "Subscription", icon: CreditCard, path: "/settings/billing", description: "Your plan and usage" },
      { id: "payment-processing", label: "Payment Processing", icon: Landmark, path: "/settings/payment-processing", description: "Payment gateway settings" },
      { id: "invoicing", label: "Invoicing", icon: FileText, path: "/settings/invoicing", description: "Invoice templates and settings" },
      { id: "products", label: "Packages & Add-Ons", icon: Package, path: "/settings/products-services", description: "Prepaid packages and extra services" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    items: [
      { id: "email", label: "Email Templates", icon: Mail, path: "/settings/email", description: "Customize email content" },
      { id: "sms", label: "SMS Settings", icon: MessageSquare, path: "/settings/sms", description: "Text message configuration" },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    items: [
      { id: "triggers", label: "Notification Triggers", icon: BellRing, path: "/settings/communication-notifications", description: "Automated alerts" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & Legal",
    items: [
      { id: "privacy", label: "Privacy Settings", icon: ShieldCheck, path: "/settings/privacy", description: "Data privacy controls" },
      { id: "terms", label: "Terms & Policies", icon: ScrollText, path: "/settings/terms-policies", description: "Legal documents" },
      { id: "audit", label: "Audit Log", icon: History, path: "/settings/audit-log", description: "Activity history" },
    ],
  },
];

// Flatten all items including children for easy lookup
const getAllItems = () => {
  const items = [];
  NAV_SECTIONS.forEach((section) => {
    section.items.forEach((item) => {
      if (item.expandable && item.children) {
        items.push(item);
        item.children.forEach((child) => items.push(child));
      } else {
        items.push(item);
      }
    });
  });
  return items;
};

const ALL_ITEMS = getAllItems();

// Helper to find which section contains a path
const findSectionForPath = (pathname) => {
  for (const section of NAV_SECTIONS) {
    const hasMatch = section.items.some((item) => {
      if (item.path === pathname) return true;
      if (item.path && pathname.startsWith(item.path + "/")) return true;
      if (item.children) {
        return item.children.some(
          (child) => child.path === pathname || pathname.startsWith(child.path)
        );
      }
      return false;
    });
    if (hasMatch) return section.id;
  }
  return null;
};

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsSidebarCollapsed, setSettingsSidebarCollapsed] = useState(false);

  // Main sidebar state from UI store
  const mainSidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleMainSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  // Start with all sections collapsed
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const initial = {};
    NAV_SECTIONS.forEach((section) => {
      initial[section.id] = true; // collapsed by default
    });
    return initial;
  });

  const [expandedItems, setExpandedItems] = useState([]); // Custom Fields NOT expanded by default

  // Toggle just the settings sidebar
  const toggleSettingsSidebar = () => {
    setSettingsSidebarCollapsed((prev) => !prev);
  };

  // Toggle both sidebars
  const toggleBothSidebars = () => {
    const newCollapsed = !settingsSidebarCollapsed || !mainSidebarCollapsed;
    setSettingsSidebarCollapsed(newCollapsed);
    setSidebarCollapsed(newCollapsed);
  };

  // Expand both sidebars
  const expandBothSidebars = () => {
    setSettingsSidebarCollapsed(false);
    setSidebarCollapsed(false);
  };

  const toggleSection = (sectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleExpandItem = (label) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const getActiveItem = () => {
    const currentPath = location.pathname;

    // Handle special cases - hidden routes that map to visible nav items
    if (currentPath === "/settings/members") {
      return ALL_ITEMS.find((item) => item.id === "team");
    }
    if (currentPath === "/settings/business") {
      return ALL_ITEMS.find((item) => item.id === "account");
    }
        if (currentPath === "/settings/custom-fields") {
      return ALL_ITEMS.find((item) => item.id === "properties");
    }
    if (currentPath === "/settings/exports") {
      return ALL_ITEMS.find((item) => item.id === "import-export");
    }

    // Handle sub-routes
    if (currentPath.startsWith("/settings/facility")) {
      return ALL_ITEMS.find((item) => item.id === "facility");
    }
    if (currentPath.startsWith("/settings/team")) {
      return ALL_ITEMS.find((item) => item.id === "team");
    }
    if (currentPath.startsWith("/settings/imports")) {
      return ALL_ITEMS.find((item) => item.id === "import-export");
    }
    if (currentPath.startsWith("/settings/properties")) {
      return ALL_ITEMS.find((item) => item.id === "properties");
    }

    // Handle objects sub-routes
    if (currentPath.startsWith("/settings/objects/owners")) {
      return ALL_ITEMS.find((item) => item.id === "objects-owners");
    }
    if (currentPath.startsWith("/settings/objects/pets")) {
      return ALL_ITEMS.find((item) => item.id === "objects-pets");
    }
    if (currentPath.startsWith("/settings/objects/bookings")) {
      return ALL_ITEMS.find((item) => item.id === "objects-bookings");
    }
    if (currentPath.startsWith("/settings/objects/services")) {
      return ALL_ITEMS.find((item) => item.id === "objects-services");
    }
    if (currentPath.startsWith("/settings/objects/facilities")) {
      return ALL_ITEMS.find((item) => item.id === "objects-facilities");
    }
    if (currentPath.startsWith("/settings/objects/packages")) {
      return ALL_ITEMS.find((item) => item.id === "objects-packages");
    }
    if (currentPath.startsWith("/settings/objects/invoices")) {
      return ALL_ITEMS.find((item) => item.id === "objects-invoices");
    }
    if (currentPath.startsWith("/settings/objects/payments")) {
      return ALL_ITEMS.find((item) => item.id === "objects-payments");
    }
    if (currentPath.startsWith("/settings/objects/tickets")) {
      return ALL_ITEMS.find((item) => item.id === "objects-tickets");
    }

    // Find exact or prefix match
    const activeItem = ALL_ITEMS.find(
      (item) => item.path && (currentPath === item.path || currentPath.startsWith(item.path + "/"))
    );
    return activeItem || ALL_ITEMS.find((item) => item.id === "profile");
  };

  const activeItem = getActiveItem();

  // Check if any object child is active
  const isObjectChildActive = activeItem?.id?.startsWith("objects-");

  // Auto-expand section containing active item on mount and route change
  useEffect(() => {
    const currentPath = location.pathname;
    const activeSectionId = findSectionForPath(currentPath);

    if (activeSectionId) {
      // Expand the section containing the active item
      setCollapsedSections((prev) => ({
        ...prev,
        [activeSectionId]: false,
      }));

      // If active item is an object child, expand Custom Fields
      if (currentPath.startsWith("/settings/objects/")) {
        setExpandedItems((prev) =>
          prev.includes("Custom Fields") ? prev : [...prev, "Custom Fields"]
        );
      }
    }
  }, [location.pathname]);

  // Sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header with Back button and collapse toggles */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border/60">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to App
        </button>

        {/* Collapse buttons */}
        <div className="flex items-center ml-auto">
          {/* Single arrow - collapse settings sidebar only */}
          <button
            type="button"
            onClick={toggleSettingsSidebar}
            className="flex items-center justify-center h-8 w-8 rounded-l-md border border-border/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Collapse settings sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Double arrow - collapse both sidebars */}
          <button
            type="button"
            onClick={toggleBothSidebars}
            className="flex items-center justify-center h-8 w-8 rounded-r-md border border-l-0 border-border/80 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Collapse all sidebars"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>
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

            return (
              <div key={section.id}>
                {/* Collapsible Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                    isCollapsed
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-300 hover:text-gray-200"
                  )}
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>

                {/* Section Items - only show when not collapsed */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mb-3">
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      // Expandable item (Objects)
                      if (item.expandable) {
                        const isExpanded = expandedItems.includes(item.label) || isObjectChildActive;

                        return (
                          <div key={item.id}>
                            {/* Expandable parent row */}
                            <button
                              type="button"
                              onClick={() => toggleExpandItem(item.label)}
                              className={cn(
                                "group w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isObjectChildActive
                                  ? "text-primary-500"
                                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                              )}
                            >
                              <span className="flex items-center gap-2.5">
                                <Icon
                                  className={cn(
                                    "h-[18px] w-[18px] flex-shrink-0",
                                    isObjectChildActive
                                      ? "text-primary-500"
                                      : "text-white/70 group-hover:text-white"
                                  )}
                                />
                                <span>{item.label}</span>
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isExpanded ? "rotate-180" : ""
                                )}
                              />
                            </button>

                            {/* Expandable children */}
                            {isExpanded && item.children && (
                              <div className="ml-4 mt-0.5 space-y-0.5">
                                {item.children.map((child) => {
                                  const isChildActive = activeItem?.id === child.id;

                                  return (
                                    <NavLink
                                      key={child.id}
                                      to={child.path}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className={cn(
                                        "group flex items-center justify-between rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                                        isChildActive
                                          ? "bg-primary-500/10 text-primary-400 border-l-2 border-primary-400"
                                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                                      )}
                                    >
                                      <span>{child.label}</span>
                                      <ChevronRight
                                        className={cn(
                                          "h-3 w-3 transition-opacity",
                                          isChildActive
                                            ? "opacity-100 text-primary-400"
                                            : "opacity-0 group-hover:opacity-60"
                                        )}
                                      />
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Regular nav item
                      const isActive = activeItem?.id === item.id;

                      return (
                        <NavLink
                          key={item.id}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary-500/10 text-primary-400 border-l-2 border-primary-400"
                              : "text-gray-300 hover:bg-gray-800 hover:text-white"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] flex-shrink-0",
                                isActive
                                  ? "text-primary-400"
                                  : "text-white/70 group-hover:text-white"
                              )}
                            />
                            <span>{item.label}</span>
                          </span>
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 transition-opacity",
                              isActive
                                ? "opacity-100 text-primary-400"
                                : "opacity-0 group-hover:opacity-60"
                            )}
                          />
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
    <div className="flex w-full h-[calc(100vh-4rem)] bg-background rounded-lg border border-border overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-shrink-0 flex-col border-r border-border bg-card h-full overflow-hidden transition-all duration-300",
          settingsSidebarCollapsed ? "w-0" : "w-64"
        )}
      >
        {!settingsSidebarCollapsed && sidebarContent}
      </aside>

      {/* Expand button when settings sidebar is collapsed */}
      {settingsSidebarCollapsed && (
        <div className="hidden md:flex flex-col items-center py-4 px-1 border-r border-border bg-card gap-2">
          {/* Single chevron - expand settings sidebar only */}
          <button
            type="button"
            onClick={toggleSettingsSidebar}
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Expand settings sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Double chevron - expand both sidebars (only show when main sidebar is also collapsed) */}
          {mainSidebarCollapsed && (
            <button
              type="button"
              onClick={expandBothSidebars}
              className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Expand all sidebars"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
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
            {activeItem?.icon && <activeItem.icon className="h-4 w-4 text-white" />}
            <span className="font-medium">{activeItem?.label}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/70 transition-transform",
              mobileMenuOpen && "rotate-180"
            )}
          />
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
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-200",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto md:pt-0 pt-24">
        <div className="w-full p-6 md:p-8">
          {/* Page Title */}
          {activeItem && (
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground">
                {activeItem.label}
              </h1>
              {activeItem.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeItem.description}
                </p>
              )}
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
