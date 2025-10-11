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

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'primary':
        return 'bg-primary hover:bg-primary-dark focus:ring-primary';
      default:
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return (
          <svg
            className="h-6 w-6 text-red-600"
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
            className="h-6 w-6 text-yellow-600"
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
            className="h-6 w-6 text-primary"
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
    <Modal open={isOpen} onClose={onClose}>
      <div className="sm:flex sm:items-start">
        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
          {getIcon()}
        </div>
        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
          <h3
            className="text-lg font-semibold leading-6 text-gray-900"
            id="modal-title"
          >
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
        <Button
          ref={confirmButtonRef}
          onClick={handleConfirm}
          className={`w-full sm:w-auto ${getVariantStyles()}`}
          disabled={isLoading}
          aria-label={confirmText}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="mt-3 sm:mt-0 w-full sm:w-auto"
          disabled={isLoading}
          aria-label={cancelText}
        >
          {cancelText}
        </Button>
      </div>
    </Modal>
  );
}
