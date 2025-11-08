import { X, Mail, FileText, Printer, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

const PaymentDetailModal = ({ payment, isOpen, onClose, onRefund }) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Payment Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Complete Payment Details</h3>
            <p className="text-gray-600 dark:text-text-secondary">Transaction breakdown, timeline, and management coming soon...</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailModal;
