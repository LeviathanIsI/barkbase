import { useState } from 'react';
import { X, Calendar, FileText, CreditCard, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const ExpressCheckOutModal = ({ pet, isOpen, onClose }) => {
  const [staySummary, setStaySummary] = useState(true);
  const [healthStatus, setHealthStatus] = useState('excellent');
  const [behavior, setBehavior] = useState('normal');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [sendReportCard, setSendReportCard] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);

  if (!isOpen || !pet) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Express Check-Out</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {pet.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">{pet.name} - {pet.breed}</h3>
                <p className="text-green-700">Ready for check-out</p>
              </div>
            </div>
          </div>

          {/* Stay Summary */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">📊 STAY SUMMARY</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">7h 15m</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Duration</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">4</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Activities</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$40.00</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Total</p>
              </div>
            </div>
          </div>

          {/* Health & Behavior */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">🏥 HEALTH & BEHAVIOR</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Health status today:</label>
                <select
                  value={healthStatus}
                  onChange={(e) => setHealthStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Behavior:</label>
                <select
                  value={behavior}
                  onChange={(e) => setBehavior(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md"
                >
                  <option value="normal">Normal</option>
                  <option value="anxious">Anxious</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Notes for owner:</label>
              <textarea
                value={ownerNotes}
                onChange={(e) => setOwnerNotes(e.target.value)}
                placeholder="Charlie had a great day! He played well with other dogs and enjoyed his lunch."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md"
              />
            </div>

            <div className="flex gap-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendReportCard}
                  onChange={(e) => setSendReportCard(e.target.checked)}
                  className="mr-2"
                />
                Email report card to owner
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="mr-2"
                />
                Include photos from today (4 photos captured)
              </label>
            </div>
          </div>

          {/* Payment */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-4">💳 PAYMENT & INVOICE</h4>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Daycare (full day)</span>
                <span>$35.00</span>
              </div>
              <div className="flex justify-between">
                <span>Lunch</span>
                <span>$5.00</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-300 dark:border-surface-border pt-2">
                <span>Total</span>
                <span>$40.00</span>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-3">
              <p className="text-red-800 dark:text-red-200">⚠️ Payment required - $40.00 due</p>
              <div className="mt-2">
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-white dark:bg-surface-primary">
                  <option>Card on file (Visa ****4242)</option>
                  <option>New card</option>
                  <option>Cash</option>
                </select>
              </div>
              <Button className="mt-2 w-full" size="sm">
                Process Payment: $40.00
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            ✓ Complete Check-Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpressCheckOutModal;
