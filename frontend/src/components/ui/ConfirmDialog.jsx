import { useEffect, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * Confirmation dialog for destructive or important actions
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {function} props.onClose - Called when dialog is closed/cancelled
 * @param {function} props.onConfirm - Called when user confirms the action
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message/description
 * @param {string} [props.confirmText='Confirm'] - Text for confirm button
 * @param {string} [props.cancelText='Cancel'] - Text for cancel button
 * @param {string} [props.variant='danger'] - Visual style variant ('danger', 'warning', 'primary')
 * @param {boolean} [props.isLoading=false] - Whether confirm action is in progress
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) {
  const confirmButtonRef = useRef(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'destructive';
      case 'primary':
        return 'primary';
      default:
        return 'destructive';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-[var(--bb-color-status-negative)]';
      case 'warning':
        return 'text-[var(--bb-color-status-warning)]';
      case 'primary':
        return 'text-[var(--bb-color-accent)]';
      default:
        return 'text-[var(--bb-color-status-negative)]';
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-[var(--bb-color-status-negative-soft)]';
      case 'warning':
        return 'bg-[var(--bb-color-status-warning-soft)]';
      case 'primary':
        return 'bg-[var(--bb-color-accent-soft)]';
      default:
        return 'bg-[var(--bb-color-status-negative-soft)]';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <svg
            className={`h-6 w-6 ${getIconColor()}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className={`h-6 w-6 ${getIconColor()}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        );
      case 'primary':
        return (
          <svg
            className={`h-6 w-6 ${getIconColor()}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="sm:flex sm:items-start">
        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getIconBg()} sm:mx-0 sm:h-10 sm:w-10`}>
          {getIcon()}
        </div>
        <div className="mt-[var(--bb-space-3)] text-center sm:ml-[var(--bb-space-4)] sm:mt-0 sm:text-left flex-1">
          <h3
            className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] leading-6 text-[var(--bb-color-text-primary)]"
            id="modal-title"
          >
            {title}
          </h3>
          <div className="mt-[var(--bb-space-2)]">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-[var(--bb-space-5)] sm:mt-[var(--bb-space-4)] flex flex-col-reverse sm:flex-row sm:justify-end gap-[var(--bb-space-3)]">
        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full sm:w-auto"
          disabled={isLoading}
          aria-label={cancelText}
        >
          {cancelText}
        </Button>
        <Button
          ref={confirmButtonRef}
          onClick={handleConfirm}
          variant={getButtonVariant()}
          className="w-full sm:w-auto"
          disabled={isLoading}
          aria-label={confirmText}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
