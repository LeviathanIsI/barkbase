import { X, Camera, FileText, Move, Calendar, AlertTriangle, CreditCard, CheckCircle, Phone, Mail, User, PawPrint } from 'lucide-react';
import Button from '@/components/ui/Button';

const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  // Use real booking data
  const displayBooking = {
    id: booking.recordId || 'Unknown',
    pet: booking.pet || {},
    owner: booking.owner || {},
    service: {
      type: 'Boarding',
      duration: `${Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))} nights`,
      checkIn: new Date(booking.checkIn).toLocaleString(),
      checkOut: new Date(booking.checkOut).toLocaleString(),
      status: booking.status || 'Unknown'
    },
    kennel: booking.segments?.[0]?.kennel || { name: 'Unassigned', type: 'N/A', size: 'N/A' },
    care: {
      medication: { required: false },
      feeding: { schedule: booking.specialInstructions || 'Standard' },
      notes: booking.notes ? [booking.notes] : [],
      vaccinations: { current: true }
    },
    payment: {
      total: booking.totalCents || 0,
      paid: booking.amountPaidCents || 0,
      balance: (booking.totalCents || 0) - (booking.amountPaidCents || 0)
    },
    checkInPhotos: [],
    timeline: []
  };

  // displayBooking already has real data from the booking prop

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-surface-secondary';
      case 'In Progress': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-surface-secondary';
      case 'Completed': return 'text-gray-600 dark:text-text-secondary bg-gray-100 dark:bg-surface-secondary';
      default: return 'text-gray-600 dark:text-text-secondary bg-gray-100 dark:bg-surface-secondary';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Booking Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pet Info */}
          <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary-600" />
              PET INFO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-medium text-gray-900 dark:text-text-primary">{displayBooking.pet.name || 'Unknown'}</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">{displayBooking.pet.breed || 'N/A'}</div>
                <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  {displayBooking.pet.age ? `${displayBooking.pet.age} years old` : ''} 
                  {displayBooking.pet.weight ? ` • ${displayBooking.pet.weight} lbs` : ''} 
                  {displayBooking.pet.neutered !== undefined ? ` • ${displayBooking.pet.neutered ? 'Neutered' : 'Not neutered'}` : ''}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-text-primary">
                  {displayBooking.owner.firstName || displayBooking.owner.name || 'Unknown'}
                  {displayBooking.owner.lastName ? ` ${displayBooking.owner.lastName}` : ''}
                </div>
                {displayBooking.owner.phone && (
                  <div className="text-sm text-gray-600 dark:text-text-secondary flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {displayBooking.owner.phone}
                  </div>
                )}
                {displayBooking.owner.email && (
                  <div className="text-sm text-gray-600 dark:text-text-secondary flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {displayBooking.owner.email}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">View Full Profile</Button>
              <Button size="sm" variant="outline">Contact Owner</Button>
            </div>
          </div>

          {/* Booking Info */}
          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              📅 BOOKING INFO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-text-secondary">Service</div>
                <div className="text-gray-900 dark:text-text-primary">{displayBooking.service.type}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-text-secondary">Kennel</div>
                <div className="text-gray-900 dark:text-text-primary">{displayBooking.kennel.name} ({displayBooking.kennel.type})</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-text-secondary">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayBooking.service.status)}`}>
                  {displayBooking.service.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-text-secondary">Check-in</div>
                <div className="text-gray-900 dark:text-text-primary flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  {displayBooking.service.checkIn} ✅ Completed
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-text-secondary">Check-out</div>
                <div className="text-gray-900 dark:text-text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  {displayBooking.service.checkOut} ⏳ Upcoming
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-text-secondary">
              Duration: {displayBooking.service.duration} • Booking ID: {displayBooking.booking.id} • Booked: {displayBooking.booking.bookedDate}
            </div>
          </div>

          {/* Care Requirements */}
          <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              💊 CARE REQUIREMENTS
            </h3>

            {/* Medication */}
            {displayBooking.care.medication.required && (
              <div className="mb-4 p-3 bg-white dark:bg-surface-primary border border-yellow-300 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-text-primary flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    Medication: {displayBooking.care.medication.name}
                  </div>
                  <Button size="sm" variant="outline">Log Dose</Button>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">
                  {displayBooking.care.medication.schedule}
                </div>
                <div className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Last given: {displayBooking.care.medication.lastGiven} by {displayBooking.care.medication.administeredBy}
                </div>
                <Button size="sm" variant="outline" className="mt-2">View Schedule</Button>
              </div>
            )}

            {/* Feeding */}
            <div className="mb-4">
              <div className="font-medium text-gray-900 dark:text-text-primary mb-1">🍖 Feeding</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">{displayBooking.care.feeding.schedule}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Special diet: {displayBooking.care.feeding.specialDiet}</div>
              <Button size="sm" variant="outline" className="mt-2">Log Feeding</Button>
            </div>

            {/* Behavioral Notes */}
            <div className="mb-4">
              <div className="font-medium text-gray-900 dark:text-text-primary mb-2">⚠️ Behavioral Notes</div>
              <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-1">
                {displayBooking.care.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 dark:text-text-tertiary mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Vaccinations */}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                ✅ Vaccinations: All current (expires {displayBooking.care.vaccinations.expires})
              </span>
            </div>
          </div>

          {/* Pricing & Payment */}
          <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              💳 PRICING & PAYMENT
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base rate: ${displayBooking.pricing.baseRate}/night × {displayBooking.pricing.nights} nights</span>
                <span>${displayBooking.pricing.subtotal}.00</span>
              </div>

              {displayBooking.pricing.addons.map((addon, index) => (
                <div key={index} className="flex justify-between text-gray-600 dark:text-text-secondary">
                  <span>Add-on: {addon.name}</span>
                  <span>${addon.total}.00</span>
                </div>
              ))}

              <div className="flex justify-between text-gray-600 dark:text-text-secondary">
                <span>Subtotal</span>
                <span>${displayBooking.pricing.subtotal + displayBooking.pricing.addons.reduce((sum, addon) => sum + addon.total, 0)}.00</span>
              </div>

              <div className="flex justify-between text-gray-600 dark:text-text-secondary">
                <span>Tax ({displayBooking.pricing.tax}%)</span>
                <span>${displayBooking.pricing.taxAmount}</span>
              </div>

              <div className="flex justify-between font-semibold border-t border-gray-300 dark:border-surface-border pt-2">
                <span>Total</span>
                <span>${displayBooking.pricing.total}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white dark:bg-surface-primary border border-green-300 rounded">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-gray-900 dark:text-text-primary">Payment Status: {displayBooking.payment.status}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">
                Method: {displayBooking.payment.method} • Paid: {displayBooking.payment.date}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">View Invoice</Button>
              <Button size="sm" variant="outline">Process Refund</Button>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-3">ACTIONS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Add Photo
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Add Note
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                Change Kennel
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Modify Booking
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-2 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                <X className="w-4 h-4" />
                Cancel Booking
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Report Card
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
