import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const OverbookingAlert = ({ onResolveOverbooking }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900">Overbooking Alert</h4>
          <p className="text-red-800 mt-1">Saturday, Oct 19 has a capacity conflict that needs resolution.</p>
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
