import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import NotFound from './NotFound';
import ProtectedRoute from './ProtectedRoute';

const Dashboard = lazy(() => import('@/features/dashboard/routes/Dashboard'));
const Bookings = lazy(() => import('@/features/bookings/routes/Bookings'));
const Calendar = lazy(() => import('@/features/calendar/routes/Calendar'));
const Pets = lazy(() => import('@/features/pets/routes/Pets'));
const Owners = lazy(() => import('@/features/owners/routes/Owners'));
const Payments = lazy(() => import('@/features/payments/routes/Payments'));
const Reports = lazy(() => import('@/features/reports/routes/Reports'));
const Admin = lazy(() => import('@/features/admin/routes/Admin'));
const TenantSettings = lazy(() => import('@/features/tenants/routes/TenantSettings'));
const Staff = lazy(() => import('@/features/staff/routes/Staff'));
const Login = lazy(() => import('@/features/auth/routes/Login'));
const Members = lazy(() => import('@/features/settings/routes/Members'));
const Billing = lazy(() => import('@/features/settings/routes/Billing'));
const PublicHome = lazy(() => import('@/features/public/routes/Home'));
const Signup = lazy(() => import('@/features/public/routes/Signup'));
const VerifyEmail = lazy(() => import('@/features/public/routes/VerifyEmail'));

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <PublicHome /> },
      { path: 'signup', element: <Signup /> },
      { path: 'verify-email', element: <VerifyEmail /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            errorElement: <NotFound />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'bookings', element: <Bookings /> },
              { path: 'calendar', element: <Calendar /> },
              { path: 'pets', element: <Pets /> },
              { path: 'owners', element: <Owners /> },
              { path: 'payments', element: <Payments /> },
              { path: 'reports', element: <Reports /> },
              { path: 'staff', element: <Staff /> },
              { path: 'tenants', element: <TenantSettings /> },
              { path: 'settings/members', element: <Members /> },
              { path: 'settings/billing', element: <Billing /> },
              { path: 'admin', element: <Admin /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  { path: '*', element: <NotFound /> },
]);
