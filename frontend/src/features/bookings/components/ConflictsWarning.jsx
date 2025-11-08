import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const ConflictsWarning = ({ onViewConflicts }) => {
  // TODO: Wire up to conflicts API when available
  const hasConflicts = false; // Replace with real conflicts query

  if (!hasConflicts) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Booking Conflicts Detected</h4>
          <p className="text-yellow-800 mt-1">Conflicts detected that need attention.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={onViewConflicts}>
              View Conflicts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictsWarning;
