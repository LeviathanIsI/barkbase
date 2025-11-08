import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

const ArchivePropertyDialog = ({ isOpen, property, onClose, onConfirm }) => {
  if (!property) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Archive "${property.label}"`}
      ariaLabel="Archive property dialog"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-surface-primary border border-orange-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-orange-900 font-medium">
              Once archived, this custom property can be restored within 90 days
            </p>
            <p className="text-sm text-orange-800 mt-1">
              After 90 days, it'll be permanently deleted.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-text mb-1">Property details</h4>
            <div className="text-sm text-muted space-y-1">
              <p>
                <span className="font-medium">Name:</span> {property.label}
              </p>
              <p>
                <span className="font-medium">Internal name:</span> {property.name}
              </p>
              <p>
                <span className="font-medium">Type:</span> {property.type}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted">
              This property will be removed from all views and will no longer be available for use in workflows, reports, or lists.
              You can restore it from the Archived tab within 90 days.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Archive property
        </Button>
      </div>
    </Modal>
  );
};

export default ArchivePropertyDialog;
