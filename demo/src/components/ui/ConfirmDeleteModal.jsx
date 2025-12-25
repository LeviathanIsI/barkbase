/**
 * ConfirmDeleteModal - enterprise delete confirmation
 * Requires user to type the resource name to confirm deletion
 */

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { cn } from '@/lib/cn';

/**
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onClose - Called when the modal is closed
 * @param {function} props.onConfirm - Called when deletion is confirmed
 * @param {string} props.resourceName - Name of the resource being deleted (must be typed to confirm)
 * @param {string} props.resourceType - Type of resource (e.g., "segment", "owner", "pet")
 * @param {boolean} props.isDeleting - Whether deletion is in progress
 * @param {string} props.warningMessage - Optional additional warning message
 */
const ConfirmDeleteModal = ({
  open,
  onClose,
  onConfirm,
  resourceName,
  resourceType = 'item',
  isDeleting = false,
  warningMessage,
}) => {
  const [confirmValue, setConfirmValue] = useState('');
  const inputRef = useRef(null);

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (open) {
      setConfirmValue('');
      // Focus input after a short delay to ensure modal is mounted
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const isConfirmValid = confirmValue === resourceName;

  const handleConfirm = () => {
    if (isConfirmValid && !isDeleting) {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isConfirmValid && !isDeleting) {
      handleConfirm();
    }
  };

  return (
    <Modal
      open={open}
      onClose={isDeleting ? undefined : onClose}
      title={`Delete ${resourceType}?`}
      size="default"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className={cn(
              'bg-red-600 hover:bg-red-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${resourceType}`
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning Icon and Message */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              This action cannot be undone
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You are about to permanently delete{' '}
              <span className="font-semibold">"{resourceName}"</span>.
              {warningMessage && ` ${warningMessage}`}
            </p>
          </div>
        </div>

        {/* Confirmation Input */}
        <div>
          <label
            htmlFor="confirm-delete-input"
            className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2"
          >
            Type <span className="font-semibold text-red-600 dark:text-red-400">"{resourceName}"</span> to confirm:
          </label>
          <input
            ref={inputRef}
            id="confirm-delete-input"
            type="text"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resourceName}
            disabled={isDeleting}
            className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-red-500/50',
              isConfirmValid
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-body)]',
              'text-[color:var(--bb-color-text-primary)]',
              'placeholder:text-[color:var(--bb-color-text-muted)]'
            )}
            autoComplete="off"
            spellCheck="false"
          />
          {confirmValue && !isConfirmValid && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Text doesn't match. Please type the exact name.
            </p>
          )}
          {isConfirmValid && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Name matches. You can now delete.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
