import { X, Phone, MessageCircle, Mail, Send } from 'lucide-react';
import Button from '@/components/ui/Button';

const CommunicationPanel = ({ pet, isOpen, onClose }) => {
  if (!isOpen || !pet) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Contact Owner</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {pet.owner.name[0]}
              </div>
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">{pet.owner.name}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Owner of {pet.name}</div>
              </div>
            </div>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <div>📞 {pet.owner.phone}</div>
              <div>📧 {pet.owner.email}</div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <h4 className="font-medium text-gray-900 dark:text-text-primary">QUICK ACTIONS:</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Call
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                SMS
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Push
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-surface-border pt-4">
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">TEMPLATES:</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary text-sm">
                "Bella is ready for pickup"
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary text-sm">
                "Running 15 mins late, be there soon"
              </button>
              <button className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary text-sm">
                "Bella had minor incident - call when free"
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationPanel;
