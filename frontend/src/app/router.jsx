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
// TenantSettings removed - consolidated into Settings
const SettingsFeatureToggles = lazy(() =>
  import("@/features/settings/routes/FeatureToggles")
);
const Staff = lazy(() => import("@/features/staff/routes/Staff"));
const Incidents = lazy(() => import("@/features/incidents/routes/Incidents"));
const Login = lazy(() => import("@/features/auth/routes/Login"));
const AuthCallback = lazy(() => import("@/features/auth/routes/AuthCallback"));
const SettingsLayout = lazy(() =>
  import("@/features/settings/components/SettingsLayout")
);
const SettingsAccountDefaults = lazy(() =>
  import("@/features/settings/routes/AccountDefaults")
);
const SettingsProfile = lazy(() =>
  import("@/features/settings/routes/Profile")
);
// SettingsGeneral removed - consolidated into Business settings
const SettingsNotifications = lazy(() =>
  import("@/features/settings/routes/Notifications")
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
const SettingsFiles = lazy(() =>
  import("@/features/settings/routes/Files")
);
const SettingsImportExport = lazy(() =>
  import("@/features/settings/routes/ImportExport")
);
const SettingsImportSummary = lazy(() =>
  import("@/features/settings/routes/ImportSummary")
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
const Segments = lazy(() =>
  import("@/features/segments/routes/Segments")
);
const SegmentDetail = lazy(() =>
  import("@/features/segments/routes/SegmentDetail")
);
const SegmentBuilder = lazy(() =>
  import("@/features/segments/routes/SegmentBuilder")
);
const Roles = lazy(() => import("@/features/roles/routes/Roles"));
const RoleEditor = lazy(() => import("@/features/roles/routes/RoleEditor"));

// Mobile Views
const MobileCheckIn = lazy(() => import("@/features/mobile/MobileCheckIn"));
const CustomerPortal = lazy(() => import("@/features/customer-portal/routes/CustomerPortal"));

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
              { path: "segments", element: <Segments /> },
              { path: "segments/new", element: <SegmentBuilder /> },
              { path: "segments/:id", element: <SegmentDetail /> },
              { path: "segments/:id/edit", element: <SegmentBuilder /> },
              { path: "payments", element: <Payments /> },
              { path: "reports", element: <Reports /> },
              // Operations
              { path: "runs", element: <RunAssignment /> },
              { path: "vaccinations", element: <Vaccinations /> },
              { path: "tasks", element: <Tasks /> },
              { path: "daycare/checkin", element: <Tasks /> },
              { path: "daycare/runs", element: <RunAssignment /> },
              { path: "mobile/tasks", element: <MobileTasks /> },
              { path: "mobile/check-in", element: <MobileCheckIn /> },
              // Customer Portal
              { path: "customer-portal", element: <CustomerPortal /> },
              // Records
              { path: "facilities", element: <Facilities /> },
              { path: "services", element: <Services /> },
              { path: "packages", element: <Packages /> },
              // Billing
              { path: "invoices", element: <Invoices /> },
              // Communication
              { path: "messages", element: <Messages /> },
              // Admin/Staff
              { path: "staff", element: <Staff /> },
              { path: "incidents", element: <Incidents /> },
              // Tenants consolidated into Settings - redirect for backwards compatibility
              { path: "tenants", element: <Navigate to="/settings" replace /> },

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
                  { index: true, element: <Navigate to="profile" replace /> },

                  // Your Preferences
                  { path: "profile", element: <SettingsProfile /> },
                  // Removed: general settings consolidated into Business
                  { path: "notifications", element: <SettingsNotifications /> },

                  // Account Management
                  { path: "account", element: <SettingsAccountDefaults /> },
                  { path: "business", element: <SettingsBusiness /> },
                  { path: "branding", element: <SettingsBranding /> },
                  { path: "team", element: <SettingsTeam /> },
                  { path: "team/roles", element: <Roles /> },
                  { path: "team/roles/new", element: <RoleEditor /> },
                  { path: "team/roles/:roleId", element: <RoleEditor /> },
                  { path: "feature-toggles", element: <SettingsFeatureToggles /> },
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
                  { path: "files", element: <SettingsFiles /> },
                  { path: "import-export", element: <SettingsImportExport /> },
                  { path: "imports/:importId", element: <SettingsImportSummary /> },
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
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  { path: "*", element: <NotFound /> },
]);
