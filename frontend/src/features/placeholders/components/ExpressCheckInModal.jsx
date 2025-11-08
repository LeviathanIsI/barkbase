import { useState } from 'react';
import { X, Camera, Clock, User, AlertTriangle, Pill, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

const ExpressCheckInModal = ({ pet, isOpen, onClose }) => {
  const [checkInTime, setCheckInTime] = useState('09:32 AM');
  const [ownerPresent, setOwnerPresent] = useState(true);
  const [healthChecks, setHealthChecks] = useState({
    healthy: true,
    noIllness: true,
    normalBehavior: true,
    flagAttention: false
  });
  const [flagReason, setFlagReason] = useState('');
  const [belongings, setBelongings] = useState({
    food: true,
    toys: true,
    medication: false,
    bedding: false,
    other: ''
  });
  const [ownerNotes, setOwnerNotes] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [includePhoto, setIncludePhoto] = useState(true);
  const [notificationMethods, setNotificationMethods] = useState({
    push: true,
    sms: true,
    email: true
  });

  if (!isOpen || !pet) return null;

  const handleHealthCheckChange = (field, value) => {
    setHealthChecks(prev => ({ ...prev, [field]: value }));
  };

  const handleBelongingsChange = (field, value) => {
    setBelongings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationMethodChange = (method, value) => {
    setNotificationMethods(prev => ({ ...prev, [method]: value }));
  };

  const calculateTotal = () => {
    let total = 35; // Base daycare rate
    if (belongings.food) total += 5; // Lunch
    return total;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Express Check-In</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pet Header */}
          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {pet.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{pet.name} - {pet.breed}</h3>
                <p className="text-blue-700 dark:text-blue-300">{pet.owner.name} • Scheduled: {pet.scheduledTime}</p>
              </div>
            </div>
          </div>

          {/* Arrival Verification */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              🏁 ARRIVAL VERIFICATION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Check-in Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Scheduled: {pet.scheduledTime}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Owner Present
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ownerPresent"
                      checked={ownerPresent}
                      onChange={() => setOwnerPresent(true)}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ownerPresent"
                      checked={!ownerPresent}
                      onChange={() => setOwnerPresent(false)}
                      className="mr-2"
                    />
                    Drop-off only
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Health Check</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={healthChecks.healthy}
                    onChange={(e) => handleHealthCheckChange('healthy', e.target.checked)}
                    className="mr-2"
                  />
                  ☑ Pet appears healthy and alert
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={healthChecks.noIllness}
                    onChange={(e) => handleHealthCheckChange('noIllness', e.target.checked)}
                    className="mr-2"
                  />
                  ☑ No signs of illness or injury
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={healthChecks.normalBehavior}
                    onChange={(e) => handleHealthCheckChange('normalBehavior', e.target.checked)}
                    className="mr-2"
                  />
                  ☑ Behavior normal for this pet
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={healthChecks.flagAttention}
                    onChange={(e) => handleHealthCheckChange('flagAttention', e.target.checked)}
                    className="mr-2"
                  />
                  ☐ Flag for staff attention
                </label>
              </div>

              {healthChecks.flagAttention && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    Reason for flag:
                  </label>
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe any concerns..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Belongings & Instructions */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              🎒 BELONGINGS & INSTRUCTIONS
            </h3>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Items brought:</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={belongings.food}
                    onChange={(e) => handleBelongingsChange('food', e.target.checked)}
                    className="mr-2"
                  />
                  Food/treats
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={belongings.toys}
                    onChange={(e) => handleBelongingsChange('toys', e.target.checked)}
                    className="mr-2"
                  />
                  Toys
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={belongings.medication}
                    onChange={(e) => handleBelongingsChange('medication', e.target.checked)}
                    className="mr-2"
                  />
                  Medication
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={belongings.bedding}
                    onChange={(e) => handleBelongingsChange('bedding', e.target.checked)}
                    className="mr-2"
                  />
                  Bedding
                </label>
              </div>

              <div className="mt-2">
                <input
                  type="text"
                  value={belongings.other}
                  onChange={(e) => handleBelongingsChange('other', e.target.value)}
                  placeholder="Other items..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Owner instructions/notes:
                </label>
                <textarea
                  value={ownerNotes}
                  onChange={(e) => setOwnerNotes(e.target.value)}
                  placeholder="Bella had a small breakfast. Please give lunch at noon..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Staff notes (internal only):
                </label>
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  placeholder="Watch for scratching, bring own toys..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Scheduled Activities Today */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              🕐 SCHEDULED ACTIVITIES TODAY
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>✅ 10:00 AM - Morning play group (Small/Medium dogs)</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>✅ 12:00 PM - Lunch feeding</span>
              </div>
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ 02:00 PM - Medication: Apoquel 16mg with food</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>✅ 03:00 PM - Afternoon play session</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>✅ 04:30 PM - Rest time</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>✅ 05:30 PM - Ready for pickup</span>
              </div>
            </div>

            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Edit Schedule
            </Button>
          </div>

          {/* Photo & Notification */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              📸 PHOTO & NOTIFICATION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Take arrival photo:</h4>
                <div className="border-2 border-dashed border-gray-300 dark:border-surface-border rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-text-secondary mb-2">Click to take photo</p>
                  <p className="text-sm text-gray-500 dark:text-text-secondary">or drag & drop</p>
                  <Button size="sm" className="mt-2">
                    Capture Photo
                  </Button>
                </div>
              </div>

              <div>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="mr-2"
                    />
                    Send "Bella arrived safely!" notification to owner
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includePhoto}
                      onChange={(e) => setIncludePhoto(e.target.checked)}
                      className="mr-2"
                    />
                    Include arrival photo in notification
                  </label>

                  <div className="ml-6 space-y-2">
                    <h4 className="font-medium text-gray-900 dark:text-text-primary">Notification method:</h4>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationMethods.push}
                        onChange={(e) => handleNotificationMethodChange('push', e.target.checked)}
                        className="mr-2"
                      />
                      Push notification (mobile app)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationMethods.sms}
                        onChange={(e) => handleNotificationMethodChange('sms', e.target.checked)}
                        className="mr-2"
                      />
                      SMS text message
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notificationMethods.email}
                        onChange={(e) => handleNotificationMethodChange('email', e.target.checked)}
                        className="mr-2"
                      />
                      Email
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Billing */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              💳 PAYMENT & BILLING
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Daycare (full day)</span>
                <span>$35.00</span>
              </div>
              <div className="flex justify-between">
                <span>Lunch</span>
                <span>$5.00</span>
              </div>
              <div className="flex justify-between">
                <span>Medication administration</span>
                <span>$3.00</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Photo updates</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-300 dark:border-surface-border pt-2">
                <span>Total</span>
                <span>${calculateTotal()}.00</span>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Payment Status: ✅ Prepaid (Membership active)</span>
              </div>
            </div>

            <Button variant="outline" size="sm" className="mt-2">
              View Package Details
            </Button>
          </div>

          {/* Reminders */}
          <div className="bg-orange-50 dark:bg-surface-primary border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-2">⚠️ REMINDERS</h3>
            <ul className="space-y-1 text-sm text-orange-800">
              <li>• Medication due at 2 PM - Set reminder for staff</li>
              <li>• Owner pickup: 5:30 PM</li>
              <li>• Vaccination expires in 6 months (Apr 2026)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            ✓ Complete Check-In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpressCheckInModal;
