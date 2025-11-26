import { Camera, QrCode, Users, Search, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

const QuickActionsBar = ({ onQRScan, onPhotoCheck, onBatchCheckIn, onWalkIn }) => {
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-text-primary">QUICK ACTIONS</h4>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onPhotoCheck}>
            <Camera className="w-4 h-4" />
            Photo Check-in
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onQRScan}>
            <QrCode className="w-4 h-4" />
            QR Scanner
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={onBatchCheckIn}>
            <Users className="w-4 h-4" />
            Batch Check-in
          </Button>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Find Pet
          </Button>

          <Button variant="secondary" size="sm" className="flex items-center gap-2" onClick={onWalkIn}>
            <Plus className="w-4 h-4" />
            Walk-in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsBar;
