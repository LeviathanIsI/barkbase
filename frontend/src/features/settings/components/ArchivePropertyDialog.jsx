/**
 * Archive Property Dialog - Phase 15 Confirmation Dialog Pattern
 * Uses centered Modal for destructive confirmations.
 */

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
      size="sm"
    >
      <div className="space-y-[var(--bb-space-4)]">
        <div className="flex items-start gap-[var(--bb-space-3)] p-[var(--bb-space-4)] bg-[var(--bb-color-alert-warning-bg)] border border-[var(--bb-color-alert-warning-border)] rounded-lg">
          <AlertTriangle className="h-5 w-5 text-[var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-alert-warning-text)] font-[var(--bb-font-weight-medium)]">
              Once archived, this custom property can be restored within 90 days
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
              After 90 days, it'll be permanently deleted.
            </p>
          </div>
        </div>

        <div className="space-y-[var(--bb-space-3)]">
          <div>
            <h4 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-1)]">Property details</h4>
            <div className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] space-y-[var(--bb-space-1)]">
              <p>
                <span className="font-[var(--bb-font-weight-medium)]">Name:</span> {property.label}
              </p>
              <p>
                <span className="font-[var(--bb-font-weight-medium)]">Internal name:</span> {property.name}
              </p>
              <p>
                <span className="font-[var(--bb-font-weight-medium)]">Type:</span> {property.type}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              This property will be removed from all views and will no longer be available for use in workflows, reports, or lists.
              You can restore it from the Archived tab within 90 days.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[var(--bb-space-6)] flex justify-end gap-[var(--bb-space-3)]">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Archive property
        </Button>
      </div>
    </Modal>
  );
};

export default ArchivePropertyDialog;
