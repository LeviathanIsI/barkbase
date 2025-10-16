import { X, Camera, FileText, Move, Calendar, AlertTriangle, CreditCard, CheckCircle, Phone, Mail, User } from 'lucide-react';
import Button from '@/components/ui/Button';

const BookingDetailModal = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  // Mock data for demonstration
  const mockBooking = {
    id: 'BK-20251013-001',
    pet: {
      name: 'Max',
      breed: 'Golden Retriever',
      age: 3,
      weight: 75,
      neutered: true,
      color: 'Golden',
      microchip: '982000123456789'
    },
    owner: {
      name: 'Sarah Johnson',
      phone: '(555) 123-4567',
      email: 'sarah.j@email.com',
      address: '123 Main St, Anytown, USA'
    },
    service: {
      type: 'Standard Boarding',
      duration: '5 nights',
      checkIn: 'Mon, Oct 13 @ 2:00 PM',
      checkOut: 'Wed, Oct 18 @ 11:00 AM',
      status: 'In Progress'
    },
    kennel: {
      name: 'K-1',
      type: 'Large indoor run',
      size: 'Large'
    },
    care: {
      medication: {
        required: true,
        name: 'Apoquel 16mg',
        schedule: 'Once daily with food',
        lastGiven: 'Today @ 8:00 AM',
        nextDose: 'Tomorrow @ 8:00 AM',
        administeredBy: 'Staff: Jenny'
      },
      feeding: {
        schedule: '2 cups twice daily (8 AM & 6 PM)',
        specialDiet: 'Grain-free',
        lastFed: 'Today @ 8:00 AM'
      },
      notes: [
        'Friendly with other dogs',
        'Anxious during thunderstorms',
        'Loves tennis balls'
      ],
      vaccinations: {
        current: true,
        expires: 'Apr 2026'
      }
    },
    pricing: {
      baseRate: 50,
      nights: 5,
      subtotal: 250,
      addons: [
        { name: 'Medication admin', amount: 3, days: 5, total: 15 },
        { name: 'Daily photo updates', amount: 25, total: 25 }
      ],
      tax: 8.5,
      taxAmount: 24.65,
      total: 314.65
    },
    payment: {
      status: 'Paid in full',
      method: 'Visa ending in 4242',
      date: 'Oct 13, 2025'
    },
    booking: {
      id: 'BK-20251013-001',
      bookedDate: 'Oct 5, 2025',
      status: 'Confirmed'
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'text-blue-600 bg-blue-100';
      case 'In Progress': return 'text-green-600 bg-green-100';
      case 'Completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pet Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              🐕 PET INFO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-medium text-gray-900">{mockBooking.pet.name}</div>
                <div className="text-sm text-gray-600">{mockBooking.pet.breed}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {mockBooking.pet.age} years old • {mockBooking.pet.weight} lbs • {mockBooking.pet.neutered ? 'Neutered' : 'Not neutered'}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">{mockBooking.owner.name}</div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {mockBooking.owner.phone}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {mockBooking.owner.email}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">View Full Profile</Button>
              <Button size="sm" variant="outline">Contact Owner</Button>
            </div>
          </div>

          {/* Booking Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📅 BOOKING INFO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Service</div>
                <div className="text-gray-900">{mockBooking.service.type}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Kennel</div>
                <div className="text-gray-900">{mockBooking.kennel.name} ({mockBooking.kennel.type})</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(mockBooking.service.status)}`}>
                  {mockBooking.service.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Check-in</div>
                <div className="text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {mockBooking.service.checkIn} ✅ Completed
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Check-out</div>
                <div className="text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  {mockBooking.service.checkOut} ⏳ Upcoming
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Duration: {mockBooking.service.duration} • Booking ID: {mockBooking.booking.id} • Booked: {mockBooking.booking.bookedDate}
            </div>
          </div>

          {/* Care Requirements */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              💊 CARE REQUIREMENTS
            </h3>

            {/* Medication */}
            {mockBooking.care.medication.required && (
              <div className="mb-4 p-3 bg-white border border-yellow-300 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Medication: {mockBooking.care.medication.name}
                  </div>
                  <Button size="sm" variant="outline">Log Dose</Button>
                </div>
                <div className="text-sm text-gray-600">
                  {mockBooking.care.medication.schedule}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Last given: {mockBooking.care.medication.lastGiven} by {mockBooking.care.medication.administeredBy}
                </div>
                <Button size="sm" variant="outline" className="mt-2">View Schedule</Button>
              </div>
            )}

            {/* Feeding */}
            <div className="mb-4">
              <div className="font-medium text-gray-900 mb-1">🍖 Feeding</div>
              <div className="text-sm text-gray-600">{mockBooking.care.feeding.schedule}</div>
              <div className="text-sm text-gray-600">Special diet: {mockBooking.care.feeding.specialDiet}</div>
              <Button size="sm" variant="outline" className="mt-2">Log Feeding</Button>
            </div>

            {/* Behavioral Notes */}
            <div className="mb-4">
              <div className="font-medium text-gray-900 mb-2">⚠️ Behavioral Notes</div>
              <ul className="text-sm text-gray-600 space-y-1">
                {mockBooking.care.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Vaccinations */}
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">
                ✅ Vaccinations: All current (expires {mockBooking.care.vaccinations.expires})
              </span>
            </div>
          </div>

          {/* Pricing & Payment */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              💳 PRICING & PAYMENT
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base rate: ${mockBooking.pricing.baseRate}/night × {mockBooking.pricing.nights} nights</span>
                <span>${mockBooking.pricing.subtotal}.00</span>
              </div>

              {mockBooking.pricing.addons.map((addon, index) => (
                <div key={index} className="flex justify-between text-gray-600">
                  <span>Add-on: {addon.name}</span>
                  <span>${addon.total}.00</span>
                </div>
              ))}

              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${mockBooking.pricing.subtotal + mockBooking.pricing.addons.reduce((sum, addon) => sum + addon.total, 0)}.00</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Tax ({mockBooking.pricing.tax}%)</span>
                <span>${mockBooking.pricing.taxAmount}</span>
              </div>

              <div className="flex justify-between font-semibold border-t border-gray-300 pt-2">
                <span>Total</span>
                <span>${mockBooking.pricing.total}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white border border-green-300 rounded">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-900">Payment Status: {mockBooking.payment.status}</span>
              </div>
              <div className="text-sm text-gray-600">
                Method: {mockBooking.payment.method} • Paid: {mockBooking.payment.date}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="outline">View Invoice</Button>
              <Button size="sm" variant="outline">Process Refund</Button>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">ACTIONS</h3>
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
              <Button size="sm" variant="outline" className="flex items-center gap-2 text-red-600 border-red-300">
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
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
