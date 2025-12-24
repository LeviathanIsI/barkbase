import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingState label="Loading…" variant="mascot" />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
