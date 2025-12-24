import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const DeletePropertyDialog = ({ isOpen, property, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete property');
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="p-[var(--bb-space-6)]">
        <div className="flex items-start gap-[var(--bb-space-4)]">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bb-color-status-negative-soft)]">
            <AlertTriangle className="h-5 w-5 text-[var(--bb-color-status-negative)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">Delete Property</h2>
            <p className="mt-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              Are you sure you want to delete the property{' '}
              <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">"{property.label}"</span>?
            </p>
            <p className="mt-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              This will remove the property definition and all its data from existing records. This action cannot be undone.
            </p>
            {error && (
              <div className="mt-[var(--bb-space-3)] rounded-lg bg-[var(--bb-color-alert-danger-bg)] border border-[var(--bb-color-alert-danger-border)] p-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-alert-danger-text)]">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="mt-[var(--bb-space-6)] flex items-center justify-end gap-[var(--bb-space-3)]">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete Property'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeletePropertyDialog;
