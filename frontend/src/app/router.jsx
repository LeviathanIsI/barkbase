import AppShell from "@/components/layout/AppShell";
import { lazy } from "react";
import { createBrowserRouter, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import NotFound from "./NotFound";
import ProtectedRoute from "./ProtectedRoute";
import RouteError from "./RouteError";

if (import.meta && import.meta.env && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info("[Router] configured");
}

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem('lastPath', location.pathname + location.search);
    } catch {}
  }, [location]);

  useEffect(() => {
    try {
      const last = localStorage.getItem('lastPath');
      if (last && window.location.pathname === '/') {
        navigate(last, { replace: true });
      }
    } catch {}
  }, []);

  return null;
}

const TodayCommandCenter = lazy(() =>
  import("@/features/today/TodayCommandCenter")
);
const Bookings = lazy(() => import("@/features/bookings/routes/Bookings"));
const Schedule = lazy(() => import("@/features/schedule/routes/Schedule"));
const Pets = lazy(() => import("@/features/pets/routes/Pets"));
const Owners = lazy(() => import("@/features/owners/routes/Owners"));
const Kennels = lazy(() => import("@/features/kennels/routes/Kennels"));
const OwnerDetail = lazy(() => import("@/features/owners/routes/OwnerDetail"));
const PetDetail = lazy(() => import("@/features/pets/routes/PetDetail"));
const Payments = lazy(() => import("@/features/payments/routes/Payments"));
const Vaccinations = lazy(() => import("@/features/vaccinations/routes/Vaccinations"));
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

// Facility Management
const FacilitySettings = lazy(() =>
  import("@/features/settings/routes/facility/FacilitySettings")
);
const PublicHome = lazy(() => import("@/features/public/routes/Home"));
const Signup = lazy(() => import("@/features/public/routes/Signup"));
const VerifyEmail = lazy(() => import("@/features/public/routes/VerifyEmail"));

// Placeholder routes for BarkBase features
// Removed: FeedingMeds and DaycareCheckin - using Tasks feature instead
const RunAssignment = lazy(() =>
  import("@/features/daycare/routes/RunAssignment")
);
const Messages = lazy(() => import("@/features/messaging/routes/Messages"));
const Tasks = lazy(() => import("@/features/tasks/routes/Tasks"));
const Operations = lazy(() => import("@/features/operations/routes/Operations"));
const MobileTasks = lazy(() => import("@/features/mobile/routes/MobileTasks"));
// Real features imported below
const Services = lazy(() => import("@/features/services/routes/Services"));
const Facilities = lazy(() => import("@/features/facilities/routes/Facilities"));
const Packages = lazy(() => import("@/features/packages/routes/Packages"));
const Invoices = lazy(() => import("@/features/invoices/routes/Invoices"));
// Removed placeholder routes: PricingRules, FollowUps, Webhooks, CustomCode, Tickets, KnowledgeBase, AuditLogs

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
const AssociationsSettings = lazy(() =>
  import("@/features/settings/routes/AssociationsSettings")
);
const PetsAssociations = lazy(() =>
  import("@/features/objects/routes/PetsAssociations")
);
const OwnersAssociations = lazy(() =>
  import("@/features/objects/routes/OwnersAssociations")
);
const CustomerDetail = lazy(() =>
  import("@/features/customers/routes/CustomerDetail")
);
const SegmentList = lazy(() =>
  import("@/features/segments/components/SegmentList")
);
const Roles = lazy(() => import("@/features/roles/routes/Roles"));
const RoleEditor = lazy(() => import("@/features/roles/routes/RoleEditor"));

// Mobile Views
const MobileCheckIn = lazy(() => import("@/features/mobile/MobileCheckIn"));

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
            element: (
              <>
                <RoutePersistence />
                <AppShell />
              </>
            ),
            errorElement: <RouteError />,
            children: [
              { index: true, element: <Navigate to="/today" replace /> },
              { path: "today", element: <TodayCommandCenter /> },
              { path: "bookings", element: <Bookings /> },
              { path: "schedule", element: <Schedule /> },
              { path: "calendar", element: <Navigate to="/schedule" replace /> },
              { path: "kennels", element: <Kennels /> },
              { path: "pets", element: <Pets /> },
              { path: "pets/:petId", element: <PetDetail /> },
              { path: "owners", element: <Owners /> },
              { path: "owners/:ownerId", element: <OwnerDetail /> },
              { path: "customers/:ownerId", element: <CustomerDetail /> },
              { path: "segments", element: <SegmentList /> },
              { path: "payments", element: <Payments /> },
              { path: "reports", element: <Reports /> },
              // Operations
              { path: "runs", element: <RunAssignment /> },
              { path: "vaccinations", element: <Vaccinations /> },
              { path: "tasks", element: <Tasks /> },
              { path: "daycare/checkin", element: <Tasks /> },
              { path: "daycare/runs", element: <RunAssignment /> },
              { path: "operations", element: <Operations /> },
              { path: "mobile/tasks", element: <MobileTasks /> },
              { path: "mobile/check-in", element: <MobileCheckIn /> },
              // Records
              { path: "facilities", element: <Facilities /> },
              { path: "services", element: <Services /> },
              { path: "packages", element: <Packages /> },
              // Billing
              { path: "invoices", element: <Invoices /> },
              // Automations
              { path: "handler-flows", element: <HandlerFlows /> },
              { path: "handler-flows/:flowId", element: <HandlerFlowDetail /> },
              {
                path: "handler-flows/runs/:runId",
                element: <HandlerRunDetail />,
              },
              // Removed placeholder routes: follow-ups, webhooks, custom-code, tickets, knowledge-base, logs
              // Communication
              { path: "messages", element: <Messages /> },
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
                  // Removed: general settings consolidated into Business
                  { path: "notifications", element: <SettingsNotifications /> },
                  { path: "security", element: <SettingsSecurity /> },

                  // Account Management
                  { path: "account", element: <SettingsAccountDefaults /> },
                  { path: "business", element: <SettingsBusiness /> },
                  { path: "branding", element: <SettingsBranding /> },
                  { path: "team", element: <SettingsTeam /> },
                  { path: "team/roles", element: <Roles /> },
                  { path: "team/roles/new", element: <RoleEditor /> },
                  { path: "team/roles/:roleId", element: <RoleEditor /> },
                  {
                    path: "account-security",
                    element: <SettingsAccountSecurity />,
                  },
                  { path: "automation", element: <SettingsAutomation /> },
                  { path: "audit-log", element: <SettingsAuditLog /> },
                  { path: "billing", element: <SettingsBilling /> },
                  { path: "members", element: <SettingsMembers /> },

                  // Facility Management
                  { path: "facility", element: <FacilitySettings /> },

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
                  { path: "objects/pets/associations", element: <PetsAssociations /> },
                  { path: "objects/owners", element: <OwnersSetup /> },
                  { path: "objects/owners/associations", element: <OwnersAssociations /> },
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
