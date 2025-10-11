import AppShell from "@/components/layout/AppShell";
import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "./NotFound";
import ProtectedRoute from "./ProtectedRoute";
import RouteError from "./RouteError";

if (import.meta && import.meta.env && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info("[Router] configured");
}

const Dashboard = lazy(() =>
  import("@/features/dashboard/routes/DashboardEnhanced")
);
const Bookings = lazy(() => import("@/features/bookings/routes/Bookings"));
const Calendar = lazy(() => import("@/features/calendar/routes/Calendar"));
const Pets = lazy(() => import("@/features/pets/routes/Pets"));
const Owners = lazy(() => import("@/features/owners/routes/Owners"));
const Payments = lazy(() => import("@/features/payments/routes/Payments"));
const Reports = lazy(() => import("@/features/reports/routes/Reports"));
const Admin = lazy(() => import("@/features/admin/routes/Admin"));
const TenantSettings = lazy(() =>
  import("@/features/tenants/routes/TenantSettings")
);
const Staff = lazy(() => import("@/features/staff/routes/Staff"));
const Login = lazy(() => import("@/features/auth/routes/Login"));
const HandlerFlows = lazy(() =>
  import("@/features/handlerFlows/routes/HandlerFlows")
);
const HandlerFlowDetail = lazy(() =>
  import("@/features/handlerFlows/routes/HandlerFlowDetail")
);
const HandlerRunDetail = lazy(() =>
  import("@/features/handlerFlows/routes/HandlerRunDetail")
);
const WorkflowBuilder = lazy(() =>
  import("@/features/handlerFlows/routes/WorkflowBuilder")
);
const SettingsLayout = lazy(() =>
  import("@/features/settings/components/SettingsLayout")
);
const SettingsAccountDefaults = lazy(() =>
  import("@/features/settings/routes/AccountDefaults")
);
const SettingsProfile = lazy(() =>
  import("@/features/settings/routes/Profile")
);
const SettingsGeneral = lazy(() =>
  import("@/features/settings/routes/General")
);
const SettingsNotifications = lazy(() =>
  import("@/features/settings/routes/Notifications")
);
const SettingsAppearance = lazy(() =>
  import("@/features/settings/routes/Appearance")
);
const SettingsSecurity = lazy(() =>
  import("@/features/settings/routes/Security")
);
const SettingsBusiness = lazy(() =>
  import("@/features/settings/routes/Business")
);
const SettingsBranding = lazy(() =>
  import("@/features/settings/routes/Branding")
);
const SettingsTeam = lazy(() => import("@/features/settings/routes/Team"));
const SettingsAccountSecurity = lazy(() =>
  import("@/features/settings/routes/AccountSecurity")
);
const SettingsAutomation = lazy(() =>
  import("@/features/settings/routes/Automation")
);
const SettingsAuditLog = lazy(() =>
  import("@/features/settings/routes/AuditLog")
);
const SettingsBilling = lazy(() =>
  import("@/features/settings/routes/Billing")
);
const SettingsMembers = lazy(() =>
  import("@/features/settings/routes/Members")
);
const SettingsCustomFields = lazy(() =>
  import("@/features/settings/routes/CustomFields")
);
const SettingsRecords = lazy(() =>
  import("@/features/settings/routes/Records")
);
const SettingsRecordKeeping = lazy(() =>
  import("@/features/settings/routes/RecordKeeping")
);
const SettingsDataQuality = lazy(() =>
  import("@/features/settings/routes/DataQuality")
);
const SettingsForms = lazy(() => import("@/features/settings/routes/Forms"));
const SettingsDocuments = lazy(() =>
  import("@/features/settings/routes/Documents")
);
const SettingsImportExport = lazy(() =>
  import("@/features/settings/routes/ImportExport")
);
const SettingsExports = lazy(() =>
  import("@/features/settings/routes/Exports")
);
const SettingsEmail = lazy(() => import("@/features/settings/routes/Email"));
const SettingsSMS = lazy(() => import("@/features/settings/routes/SMS"));
const SettingsCommunicationNotifications = lazy(() =>
  import("@/features/settings/routes/CommunicationNotifications")
);
const SettingsBookingConfig = lazy(() =>
  import("@/features/settings/routes/BookingConfig")
);
const SettingsCalendarSettings = lazy(() =>
  import("@/features/settings/routes/CalendarSettings")
);
const SettingsOnlineBooking = lazy(() =>
  import("@/features/settings/routes/OnlineBooking")
);
const SettingsServices = lazy(() =>
  import("@/features/settings/routes/Services")
);
const SettingsPaymentProcessing = lazy(() =>
  import("@/features/settings/routes/PaymentProcessing")
);
const SettingsInvoicing = lazy(() =>
  import("@/features/settings/routes/Invoicing")
);
const SettingsProductsServices = lazy(() =>
  import("@/features/settings/routes/ProductsServices")
);
const SettingsDomain = lazy(() => import("@/features/settings/routes/Domain"));
const SettingsIntegrations = lazy(() =>
  import("@/features/settings/routes/Integrations")
);
const SettingsMobile = lazy(() => import("@/features/settings/routes/Mobile"));
const SettingsPrivacy = lazy(() =>
  import("@/features/settings/routes/Privacy")
);
const SettingsTermsPolicies = lazy(() =>
  import("@/features/settings/routes/TermsPolicies")
);
const SettingsReporting = lazy(() =>
  import("@/features/settings/routes/Reporting")
);
const PublicHome = lazy(() => import("@/features/public/routes/Home"));
const Signup = lazy(() => import("@/features/public/routes/Signup"));
const VerifyEmail = lazy(() => import("@/features/public/routes/VerifyEmail"));

// Placeholder routes for BarkBase features
const RunAssignment = lazy(() =>
  import("@/features/placeholders/routes/RunAssignment")
);
const FeedingMeds = lazy(() =>
  import("@/features/placeholders/routes/FeedingMeds")
);
const DaycareCheckin = lazy(() =>
  import("@/features/placeholders/routes/DaycareCheckin")
);
const Facilities = lazy(() =>
  import("@/features/placeholders/routes/Facilities")
);
const ServicesAddons = lazy(() =>
  import("@/features/placeholders/routes/ServicesAddons")
);
const Packages = lazy(() => import("@/features/placeholders/routes/Packages"));
const Invoices = lazy(() => import("@/features/placeholders/routes/Invoices"));
const PricingRules = lazy(() =>
  import("@/features/placeholders/routes/PricingRules")
);
const FollowUps = lazy(() =>
  import("@/features/placeholders/routes/FollowUps")
);
const Webhooks = lazy(() => import("@/features/placeholders/routes/Webhooks"));
const CustomCode = lazy(() =>
  import("@/features/placeholders/routes/CustomCode")
);
const Tickets = lazy(() => import("@/features/placeholders/routes/Tickets"));
const KnowledgeBase = lazy(() =>
  import("@/features/placeholders/routes/KnowledgeBase")
);
const AuditLogs = lazy(() =>
  import("@/features/placeholders/routes/AuditLogs")
);

// Object setup pages
const PetsSetup = lazy(() => import("@/features/objects/routes/PetsSetup"));
const OwnersSetup = lazy(() => import("@/features/objects/routes/OwnersSetup"));
const BookingsSetup = lazy(() =>
  import("@/features/objects/routes/BookingsSetup")
);
const FacilitiesSetup = lazy(() =>
  import("@/features/objects/routes/FacilitiesSetup")
);
const ServicesSetup = lazy(() =>
  import("@/features/objects/routes/ServicesSetup")
);
const PackagesSetup = lazy(() =>
  import("@/features/objects/routes/PackagesSetup")
);
const InvoicesSetup = lazy(() =>
  import("@/features/objects/routes/InvoicesSetup")
);
const PaymentsSetup = lazy(() =>
  import("@/features/objects/routes/PaymentsSetup")
);
const TicketsSetup = lazy(() =>
  import("@/features/objects/routes/TicketsSetup")
);
const PropertiesSettings = lazy(() =>
  import("@/features/settings/routes/PropertiesSettings")
);
const PropertyDetail = lazy(() =>
  import("@/features/settings/routes/PropertyDetail")
);

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, element: <PublicHome /> },
      { path: "signup", element: <Signup /> },
      { path: "verify-email", element: <VerifyEmail /> },
      {
        element: <ProtectedRoute />,
        children: [
          // Full-screen workflow builder (outside AppShell)
          { path: "handler-flows/builder", element: <WorkflowBuilder /> },
          {
            element: <AppShell />,
            errorElement: <RouteError />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: "dashboard", element: <Dashboard /> },
              { path: "bookings", element: <Bookings /> },
              { path: "calendar", element: <Calendar /> },
              { path: "pets", element: <Pets /> },
              { path: "owners", element: <Owners /> },
              { path: "payments", element: <Payments /> },
              { path: "reports", element: <Reports /> },
              // Operations
              { path: "runs", element: <RunAssignment /> },
              { path: "feeding-meds", element: <FeedingMeds /> },
              { path: "daycare/checkin", element: <DaycareCheckin /> },
              // Records
              { path: "facilities", element: <Facilities /> },
              { path: "services", element: <ServicesAddons /> },
              { path: "packages", element: <Packages /> },
              // Billing
              { path: "invoices", element: <Invoices /> },
              { path: "pricing-rules", element: <PricingRules /> },
              // Automations
              { path: "handler-flows", element: <HandlerFlows /> },
              { path: "handler-flows/:flowId", element: <HandlerFlowDetail /> },
              {
                path: "handler-flows/runs/:runId",
                element: <HandlerRunDetail />,
              },
              { path: "automations/follow-ups", element: <FollowUps /> },
              { path: "automations/webhooks", element: <Webhooks /> },
              { path: "automations/custom-code", element: <CustomCode /> },
              // Support
              { path: "support/tickets", element: <Tickets /> },
              { path: "support/knowledge-base", element: <KnowledgeBase /> },
              { path: "support/logs", element: <AuditLogs /> },
              // Admin/Staff
              { path: "staff", element: <Staff /> },
              { path: "tenants", element: <TenantSettings /> },

              // Legacy redirects for old /properties and /objects/* URLs
              { path: "properties", element: <Navigate to="/settings/properties" replace /> },
              { path: "objects/pets", element: <Navigate to="/settings/objects/pets" replace /> },
              { path: "objects/owners", element: <Navigate to="/settings/objects/owners" replace /> },
              { path: "objects/bookings", element: <Navigate to="/settings/objects/bookings" replace /> },
              { path: "objects/facilities", element: <Navigate to="/settings/objects/facilities" replace /> },
              { path: "objects/services", element: <Navigate to="/settings/objects/services" replace /> },
              { path: "objects/packages", element: <Navigate to="/settings/objects/packages" replace /> },
              { path: "objects/invoices", element: <Navigate to="/settings/objects/invoices" replace /> },
              { path: "objects/payments", element: <Navigate to="/settings/objects/payments" replace /> },
              { path: "objects/tickets", element: <Navigate to="/settings/objects/tickets" replace /> },

              // =========================
              // SETTINGS (single layout)
              // =========================
              {
                path: "settings",
                element: <SettingsLayout />,
                children: [
                  { index: true, element: <Navigate to="account" replace /> },

                  // Your Preferences
                  { path: "profile", element: <SettingsProfile /> },
                  { path: "general", element: <SettingsGeneral /> },
                  { path: "notifications", element: <SettingsNotifications /> },
                  { path: "appearance", element: <SettingsAppearance /> },
                  { path: "security", element: <SettingsSecurity /> },

                  // Account Management
                  { path: "account", element: <SettingsAccountDefaults /> },
                  { path: "business", element: <SettingsBusiness /> },
                  { path: "branding", element: <SettingsBranding /> },
                  { path: "team", element: <SettingsTeam /> },
                  {
                    path: "account-security",
                    element: <SettingsAccountSecurity />,
                  },
                  { path: "automation", element: <SettingsAutomation /> },
                  { path: "audit-log", element: <SettingsAuditLog /> },
                  { path: "billing", element: <SettingsBilling /> },
                  { path: "members", element: <SettingsMembers /> },

                  // Data Management
                  { path: "custom-fields", element: <SettingsCustomFields /> },
                  { path: "records", element: <SettingsRecords /> },
                  {
                    path: "record-keeping",
                    element: <SettingsRecordKeeping />,
                  },
                  { path: "data-quality", element: <SettingsDataQuality /> },
                  { path: "forms", element: <SettingsForms /> },
                  { path: "documents", element: <SettingsDocuments /> },
                  { path: "import-export", element: <SettingsImportExport /> },
                  { path: "exports", element: <SettingsExports /> },

                  // Communication
                  { path: "email", element: <SettingsEmail /> },
                  { path: "sms", element: <SettingsSMS /> },
                  {
                    path: "communication-notifications",
                    element: <SettingsCommunicationNotifications />,
                  },

                  // Booking & Scheduling
                  {
                    path: "booking-config",
                    element: <SettingsBookingConfig />,
                  },
                  {
                    path: "calendar-settings",
                    element: <SettingsCalendarSettings />,
                  },
                  {
                    path: "online-booking",
                    element: <SettingsOnlineBooking />,
                  },
                  { path: "services", element: <SettingsServices /> },

                  // Billing
                  {
                    path: "payment-processing",
                    element: <SettingsPaymentProcessing />,
                  },
                  { path: "invoicing", element: <SettingsInvoicing /> },
                  {
                    path: "products-services",
                    element: <SettingsProductsServices />,
                  },

                  // Website & Integrations
                  { path: "domain", element: <SettingsDomain /> },
                  { path: "integrations", element: <SettingsIntegrations /> },
                  { path: "mobile", element: <SettingsMobile /> },

                  // Compliance
                  { path: "privacy", element: <SettingsPrivacy /> },
                  {
                    path: "terms-policies",
                    element: <SettingsTermsPolicies />,
                  },

                  // Insights
                  { path: "reporting", element: <SettingsReporting /> },

                  // Data Management - Properties & Objects
                  { path: "properties", element: <PropertiesSettings /> },
                  { path: "properties/:objectType/:propertyId", element: <PropertyDetail /> },
                  { path: "objects", element: <Navigate to="objects/pets" replace /> },
                  { path: "objects/pets", element: <PetsSetup /> },
                  { path: "objects/owners", element: <OwnersSetup /> },
                  { path: "objects/bookings", element: <BookingsSetup /> },
                  { path: "objects/facilities", element: <FacilitiesSetup /> },
                  { path: "objects/services", element: <ServicesSetup /> },
                  { path: "objects/packages", element: <PackagesSetup /> },
                  { path: "objects/invoices", element: <InvoicesSetup /> },
                  { path: "objects/payments", element: <PaymentsSetup /> },
                  { path: "objects/tickets", element: <TicketsSetup /> },
                ],
              },

              // Admin
              { path: "admin", element: <Admin /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  { path: "*", element: <NotFound /> },
]);
