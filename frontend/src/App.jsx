import { RouterProvider } from 'react-router-dom';
import AppProviders from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import Skeleton from '@/components/ui/Skeleton';

const App = () => (
  <AppProviders fallback={<Skeleton className="h-screen w-full" />}>
    <RouterProvider router={router} />
  </AppProviders>
);

export default App;
