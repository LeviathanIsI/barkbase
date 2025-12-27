import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const NAV_SECTIONS = [
  {
    id: "preferences",
    title: "Your Preferences",
    items: [
      { label: "Profile", to: "/settings/profile" },
      { label: "Notifications", to: "/settings/notifications" },
    ],
  },
  {
    id: "business",
    title: "Business",
    items: [
      { label: "Business Info", to: "/settings/account" },
      { label: "Users & Teams", to: "/settings/team" },
      { label: "Integrations", to: "/settings/integrations" },
      { label: "Domain & SSL", to: "/settings/domain" },
      { label: "Feature Toggles", to: "/settings/feature-toggles" },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    items: [
      { label: "Branding", to: "/settings/branding" },
      { label: "Terminology", to: "/settings/terminology" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { label: "Facility Setup", to: "/settings/facility" },
      { label: "Services & Pricing", to: "/settings/services" },
      { label: "Booking Rules", to: "/settings/booking-config" },
      { label: "Online Booking", to: "/settings/online-booking" },
      { label: "Calendar Settings", to: "/settings/calendar-settings" },
    ],
  },
  {
    id: "data",
    title: "Data",
    items: [
      {
        label: "Custom Fields",
        isExpandable: true,
        children: [
          { label: "Pets", to: "/settings/objects/pets" },
          { label: "Owners", to: "/settings/objects/owners" },
          { label: "Bookings", to: "/settings/objects/bookings" },
          { label: "Invoices", to: "/settings/objects/invoices" },
          { label: "Payments", to: "/settings/objects/payments" },
        ],
      },
      { label: "Forms", to: "/settings/forms" },
      { label: "Documents", to: "/settings/documents" },
      { label: "Files", to: "/settings/files" },
      { label: "Import & Export", to: "/settings/import-export" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    items: [
      { label: "Subscription", to: "/settings/billing" },
      { label: "Payment Processing", to: "/settings/payment-processing" },
      { label: "Invoicing", to: "/settings/invoicing" },
      { label: "Packages & Add-Ons", to: "/settings/products-services" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    items: [
      { label: "Email Templates", to: "/settings/email" },
      { label: "SMS Settings", to: "/settings/sms" },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    items: [
      { label: "Notification Triggers", to: "/settings/communication-notifications" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance & Legal",
    items: [
      { label: "Audit Log", to: "/settings/audit-log" },
      { label: "Privacy Settings", to: "/settings/privacy" },
      { label: "Terms & Policies", to: "/settings/terms-policies" },
    ],
  },
];

const SettingsSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({ "Custom Fields": true });

  const toggleExpanded = (itemLabel) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemLabel]: !prev[itemLabel],
    }));
  };

  const renderBadge = (badge) => {
    if (!badge) return null;
    const tone = badge.tone === "info" ? "info" : "primary";
    return (
      <Badge
        variant={tone === "info" ? "info" : "primary"}
        className={tone === "info" ? "bg-primary/10 text-primary" : undefined}
      >
        {badge.label}
      </Badge>
    );
  };

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col border-r border-border bg-white dark:bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          className="p-1.5 text-muted hover:text-text transition-colors"
          aria-label="Search settings"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-4">
            {/* Section Header - enterprise style: bold, not clickable */}
            <div className="px-4 mb-1">
              <span className="text-sm font-semibold text-text">
                {section.title}
              </span>
            </div>

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                // Handle expandable items (like Custom Fields)
                if (item.isExpandable && item.children) {
                  const isExpanded = expandedItems[item.label];
                  const hasActiveChild = item.children.some(
                    (child) => location.pathname === child.to
                  );

                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.label)}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-1.5 text-sm transition-colors",
                          hasActiveChild
                            ? "text-primary font-medium"
                            : "text-text/70 hover:text-text hover:bg-gray-50 dark:hover:bg-surface-secondary"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {renderBadge(item.badge)}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 text-muted transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="ml-4 border-l border-border">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={({ isActive }) =>
                                cn(
                                  "block px-4 py-1.5 text-sm transition-colors",
                                  isActive
                                    ? "text-primary font-medium bg-primary/5"
                                    : "text-text/70 hover:text-text hover:bg-gray-50 dark:hover:bg-surface-secondary"
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular items - flat, clean, enterprise style
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-4 py-1.5 text-sm transition-colors",
                        isActive
                          ? "text-primary font-medium bg-primary/5"
                          : "text-text/70 hover:text-text hover:bg-gray-50 dark:hover:bg-surface-secondary"
                      )
                    }
                  >
                    <span className="flex items-center gap-2">
                      {item.label}
                      {renderBadge(item.badge)}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SettingsSidebar;
