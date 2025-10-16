import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const ConflictsWarning = ({ onViewConflicts }) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-yellow-900">Booking Conflicts Detected</h4>
          <p className="text-yellow-800 mt-1">2 potential conflicts need attention.</p>
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
