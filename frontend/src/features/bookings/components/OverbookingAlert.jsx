import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const OverbookingAlert = ({ onResolveOverbooking }) => {
  // TODO: Wire up to capacity/overbooking API when available
  const hasOverbooking = false; // Replace with real overbooking query

  if (!hasOverbooking) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 dark:text-red-100">Overbooking Alert</h4>
          <p className="text-red-800 dark:text-red-200 mt-1">Capacity conflict detected that needs resolution.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onResolveOverbooking}>
              Resolve Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverbookingAlert;
