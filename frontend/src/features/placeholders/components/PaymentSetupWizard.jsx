import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PaymentSetupWizard = ({ isOpen, onClose, onComplete }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payment Processor Setup</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Setup</h3>
            <p className="text-gray-600 mb-6">Connect your payment processor (Stripe, Square, etc.)</p>
            <Button onClick={() => onComplete()}>
              Complete Setup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetupWizard;



