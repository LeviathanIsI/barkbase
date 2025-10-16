import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const NewBookingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Booking</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">➕</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4-Step Booking Process</h3>
            <p className="text-gray-600">Complete booking workflow with smart defaults coming soon...</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>
            Create Booking
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewBookingModal;