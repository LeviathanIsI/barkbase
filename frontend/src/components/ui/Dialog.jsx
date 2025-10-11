import { useMemo } from 'react';
import Modal from './Modal';
import { cn } from '@/lib/cn';

const Dialog = ({ open, onOpenChange, title, description, children, footer, className, contentClassName }) => {
  const handleClose = useMemo(
    () => (onOpenChange ? () => onOpenChange(false) : undefined),
    [onOpenChange],
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      className={cn('max-w-lg', className)}
      footer={footer}
    >
      {description ? (
        <p className="text-sm text-muted">{description}</p>
      ) : null}
      <div className={cn('mt-4 space-y-3', contentClassName)}>
        {children}
      </div>
    </Modal>
  );
};

export default Dialog;
