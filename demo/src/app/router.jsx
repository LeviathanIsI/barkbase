/**
 * Demo Router
 * Simplified router for demo mode.
 * Only includes: Dashboard, Owners, Pets, Bookings, Check-in, Vaccinations
 * No auth guards - user is always "logged in" as demo user.
 */

import AppShell from '@/components/layout/AppShell';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import NotFound from './NotFound';
import RouteError from './RouteError';
import PageLoader from '@/components/PageLoader';

// Lazy load feature pages
const TodayCommandCenter = lazy(() => import('@/features/today/TodayCommandCenter'));
const Bookings = lazy(() => import('@/features/bookings/routes/Bookings'));
const Pets = lazy(() => import('@/features/pets/routes/Pets'));
const PetDetail = lazy(() => import('@/features/pets/routes/PetDetail'));
const Owners = lazy(() => import('@/features/owners/routes/Owners'));
const OwnerDetail = lazy(() => import('@/features/owners/routes/OwnerDetail'));
const Vaccinations = lazy(() => import('@/features/vaccinations/routes/Vaccinations'));
const Tasks = lazy(() => import('@/features/tasks/routes/Tasks'));

// Wrapper component for lazy-loaded routes
const LazyRoute = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      // Redirect root to today/dashboard
      { index: true, element: <Navigate to="/today" replace /> },

      // Dashboard / Command Center
      {
        path: 'today',
        element: <LazyRoute><TodayCommandCenter /></LazyRoute>,
      },

      // Bookings / Calendar
      {
        path: 'bookings',
        element: <LazyRoute><Bookings /></LazyRoute>,
      },

      // Owners
      {
        path: 'owners',
        element: <LazyRoute><Owners /></LazyRoute>,
      },
      {
        path: 'owners/:ownerId',
        element: <LazyRoute><OwnerDetail /></LazyRoute>,
      },

      // Pets
      {
        path: 'pets',
        element: <LazyRoute><Pets /></LazyRoute>,
      },
      {
        path: 'pets/:petId',
        element: <LazyRoute><PetDetail /></LazyRoute>,
      },

      // Vaccinations
      {
        path: 'vaccinations',
        element: <LazyRoute><Vaccinations /></LazyRoute>,
      },

      // Check-in / Tasks
      {
        path: 'tasks',
        element: <LazyRoute><Tasks /></LazyRoute>,
      },
      {
        path: 'check-in',
        element: <LazyRoute><Tasks /></LazyRoute>,
      },

      // Redirect legacy routes
      { path: 'dashboard', element: <Navigate to="/today" replace /> },
      { path: 'calendar', element: <Navigate to="/bookings" replace /> },
      { path: 'customers', element: <Navigate to="/owners" replace /> },
      {
        path: 'customers/:ownerId',
        element: <LazyRoute><OwnerDetail /></LazyRoute>,
      },

      // Catch-all for routes not in demo
      { path: '*', element: <NotFound /> },
    ],
  },
  // 404 for completely unknown paths
  { path: '*', element: <NotFound /> },
]);
