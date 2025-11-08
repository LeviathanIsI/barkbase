import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const NodeActions = ({ nodeId, onClone, onMoveUp, onMoveDown, onDelete, canMoveUp = true, canMoveDown = true }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDelete?.(nodeId);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Clone */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClone?.(nodeId);
          }}
          className="w-7 h-7 rounded bg-surface border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors flex items-center justify-center shadow-md"
          title="Clone this step"
          aria-label="Clone step"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Move Up */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp?.(nodeId);
          }}
          disabled={!canMoveUp}
          className={`w-7 h-7 rounded bg-surface border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors flex items-center justify-center shadow-md ${
            !canMoveUp ? 'opacity-30 cursor-not-allowed' : ''
          }`}
          title="Move step up"
          aria-label="Move step up"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Move Down */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown?.(nodeId);
          }}
          disabled={!canMoveDown}
          className={`w-7 h-7 rounded bg-surface border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors flex items-center justify-center shadow-md ${
            !canMoveDown ? 'opacity-30 cursor-not-allowed' : ''
          }`}
          title="Move step down"
          aria-label="Move step down"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={handleDeleteClick}
          className="w-7 h-7 rounded bg-surface border border-border hover:bg-red-50 dark:bg-red-950/20 hover:text-white hover:border-red-500 transition-colors flex items-center justify-center shadow-md"
          title="Delete this step"
          aria-label="Delete step"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete step?"
        message="Are you sure you want to delete this step? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
};

export default NodeActions;
