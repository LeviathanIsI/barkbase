import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { usePageView } from '@/hooks/useTelemetry';

const NotAuthorized = () => {
  usePageView('not-authorized');

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-50 dark:bg-red-950/10 p-6">
            <ShieldX className="h-16 w-16 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text">Access Denied</h1>
          <p className="text-sm text-muted">
            You don't have permission to access this feature. Contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link to="/today">
            <Button size="lg">
              Return to Dashboard
            </Button>
          </Link>
          <p className="text-xs text-muted">
            Need help? Check your account permissions or upgrade your plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotAuthorized;
