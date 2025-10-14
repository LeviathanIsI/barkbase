import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const NAV_SECTIONS = [
  { recordId: "preferences",
    title: "Your Preferences",
    items: [
      { label: "Profile", to: "/settings/profile" },
      { label: "General", to: "/settings/general" },
      { label: "Notifications", to: "/settings/notifications" },
      { label: "Security", to: "/settings/security" },
    ],
  },
  { recordId: "account-management",
    title: "Account Management",
    items: [
      { label: "Account Defaults", to: "/settings/account" },
      { label: "Business Profile", to: "/settings/business" },
      { label: "Branding", to: "/settings/branding" },
      { label: "Users & Teams", to: "/settings/team" },
      { label: "Account Security", to: "/settings/account-security" },
      { label: "Automation", to: "/settings/automation" },
      { label: "Audit Log", to: "/settings/audit-log" },
      { label: "Billing & Subscription", to: "/settings/billing" },
      { label: "Members", to: "/settings/members" },
    ],
  },
  { recordId: "facility-management",
    title: "Facility Management",
    items: [
      { label: "Accommodations", to: "/settings/facility/accommodations" },
      { label: "Inventory Management", to: "/settings/facility/inventory" },
      { label: "Facility Locations", to: "/settings/facility/locations" },
      { label: "Training & Schedules", to: "/settings/facility/schedules" },
    ],
  },
  { recordId: "data-management",
    title: "Data Management",
    items: [
      { label: "Properties", to: "/settings/properties" },
      {
        label: "Objects",
        isExpandable: true,
        children: [
          { label: "Pets", to: "/settings/objects/pets" },
          { label: "Owners", to: "/settings/objects/owners" },
          { label: "Bookings", to: "/settings/objects/bookings" },
          { label: "Invoices", to: "/settings/objects/invoices" },
          { label: "Payments", to: "/settings/objects/payments" },
          { label: "Tickets", to: "/settings/objects/tickets" },
        ],
      },
      { label: "Record Keeping", to: "/settings/record-keeping" },
      { label: "Data Quality", to: "/settings/data-quality" },
      { label: "Forms", to: "/settings/forms" },
      { label: "Documents & Files", to: "/settings/documents" },
      { label: "Import & Export", to: "/settings/import-export" },
      { label: "Exports", to: "/settings/exports" },
    ],
  },
  { recordId: "communication",
    title: "Communication",
    items: [
      { label: "Email Settings", to: "/settings/email" },
      { label: "SMS Settings", to: "/settings/sms" },
      {
        label: "Communication Alerts",
        to: "/settings/communication-notifications",
      },
    ],
  },
  { recordId: "booking",
    title: "Booking & Scheduling",
    items: [
      { label: "Booking Configuration", to: "/settings/booking-config" },
      { label: "Calendar Settings", to: "/settings/calendar-settings" },
      { label: "Online Booking Portal", to: "/settings/online-booking" },
      { label: "Services & Offerings", to: "/settings/services" },
    ],
  },
  { recordId: "billing",
    title: "Payment & Invoicing",
    items: [
      { label: "Payment Processing", to: "/settings/payment-processing" },
      { label: "Invoicing", to: "/settings/invoicing" },
      { label: "Products & Packages", to: "/settings/products-services" },
    ],
  },
  { recordId: "integrations",
    title: "Website & Integrations",
    items: [
      { label: "Domain & Hosting", to: "/settings/domain" },
      { label: "Integrations", to: "/settings/integrations" },
      {
        label: "Mobile",
        to: "/settings/mobile",
        badge: { label: "BETA", tone: "info" },
      },
    ],
  },
  { recordId: "compliance",
    title: "Compliance & Legal",
    items: [
      { label: "Privacy & Consent", to: "/settings/privacy" },
      { label: "Terms & Policies", to: "/settings/terms-policies" },
    ],
  },
  { recordId: "insights",
    title: "Insights & Reporting",
    items: [{ label: "Reporting & Analytics", to: "/settings/reporting" }],
  },
];

const SettingsSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({ Objects: true });

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
    <aside className="sticky top-0 flex h-screen w-72 flex-shrink-0 flex-col border-r border-border/70 bg-surface">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-primary"
          aria-label="Search settings"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text">Settings</h2>
          <p className="mt-1 text-xs text-muted">
            Manage how BarkBase runs for your team and customers.
          </p>
        </div>

        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.recordId} className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-text/80 border-b border-border/30 pb-1 mb-3">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  // Handle expandable items
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
                            "group flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors",
                            hasActiveChild
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "text-muted hover:border-border/60 hover:bg-surface/80 hover:text-primary"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span>{item.label}</span>
                            {renderBadge(item.badge)}
                          </span>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <div className="ml-4 mt-1 space-y-1 border-l border-border/40 pl-3">
                            {item.children.map((child) => {
                              const childActive =
                                location.pathname === child.to;
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={({ isActive }) =>
                                    cn(
                                      "group flex items-center justify-between rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium transition-colors",
                                      isActive || childActive
                                        ? "border-primary/30 bg-primary/10 text-primary"
                                        : "text-muted hover:border-border/60 hover:bg-surface/80 hover:text-primary"
                                    )
                                  }
                                >
                                  <span>{child.label}</span>
                                  <ChevronRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Handle regular items
                  const active = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors",
                          isActive || active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "text-muted hover:border-border/60 hover:bg-surface/80 hover:text-primary"
                        )
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {renderBadge(item.badge)}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
