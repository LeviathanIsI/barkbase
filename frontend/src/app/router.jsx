import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import NotFound from './NotFound';
import ProtectedRoute from './ProtectedRoute';

const Dashboard = lazy(() => import('@/features/dashboard/routes/Dashboard'));
const Bookings = lazy(() => import('@/features/bookings/routes/Bookings'));
const Pets = lazy(() => import('@/features/pets/routes/Pets'));
const Owners = lazy(() => import('@/features/owners/routes/Owners'));
const Payments = lazy(() => import('@/features/payments/routes/Payments'));
const Reports = lazy(() => import('@/features/reports/routes/Reports'));
const Admin = lazy(() => import('@/features/admin/routes/Admin'));
const TenantSettings = lazy(() => import('@/features/tenants/routes/TenantSettings'));
const Staff = lazy(() => import('@/features/staff/routes/Staff'));
const Login = lazy(() => import('@/features/auth/routes/Login'));
const Members = lazy(() => import('@/features/settings/routes/Members'));

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'bookings', element: <Bookings /> },
          { path: 'pets', element: <Pets /> },
          { path: 'owners', element: <Owners /> },
          { path: 'payments', element: <Payments /> },
          { path: 'reports', element: <Reports /> },
          { path: 'staff', element: <Staff /> },
          { path: 'tenants', element: <TenantSettings /> },
          { path: 'settings/members', element: <Members /> },
          { path: 'admin', element: <Admin /> },
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
