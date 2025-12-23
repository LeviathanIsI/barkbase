import { Clock, CheckCircle, Home, AlertTriangle, Pill, Calendar, FileText, MessageCircle, Phone, Mail, Edit, UserCheck, X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/primitives';

const BookingCard = ({ booking, onCheckIn, onCheckOut, onEdit, onCancel, onContact, onViewDetails, isSelected, onSelect }) => {

  return (
    <Card className={`p-6 hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Header with Checkbox and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(booking.id || booking.recordId)}
            className="w-4 h-4 rounded border-gray-300 dark:border-surface-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">#{(booking.id || booking.recordId || '').slice(0, 8)}</h3>
              <StatusPill status={booking.status || 'pending'} />
            </div>
          </div>
        </div>
      </div>

      {/* Pet & Owner Info */}
      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {(booking.pet?.name || booking.pets?.[0]?.name)?.[0] || 'P'}
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{booking.pet?.name || booking.pets?.[0]?.name || 'Unknown Pet'}</h4>
            <p className="text-gray-600 dark:text-text-secondary">
              {booking.pet?.breed || 'Unknown breed'}
              {booking.pet?.age ? ` • ${booking.pet.age} yrs` : ''}
              {booking.pet?.weight ? ` • ${booking.pet.weight} lbs` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900 dark:text-text-primary">{booking.owner?.name || 'Unknown Owner'}</div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary">
              {booking.owner?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{booking.owner.phone}</span>
                </div>
              )}
              {booking.owner?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span>{booking.owner.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {booking.owner?.phone && (
              <Button size="sm" variant="outline" onClick={() => onContact?.(booking)}>
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
            )}
            {booking.owner?.phone && (
              <Button size="sm" variant="outline" onClick={() => onContact?.(booking)}>
                <MessageCircle className="w-3 h-3 mr-1" />
                SMS
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dates & Service */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">Check-in</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
            {booking.checkIn ? format(new Date(booking.checkIn), 'MMM d, yyyy') : 'Not set'}
          </p>
          <p className="text-sm text-gray-600 dark:text-text-secondary">2:00 PM</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">Check-out</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
            {booking.checkOut ? format(new Date(booking.checkOut), 'MMM d, yyyy') : 'Not set'}
          </p>
          <p className="text-sm text-gray-600 dark:text-text-secondary">11:00 AM</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">Service</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
              {booking.services?.[0]?.service?.name || 'Boarding'}
            </p>
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              {booking.segments?.[0]?.kennel?.name || 'Kennel'} • Pre-assigned
            </p>
          </div>
        </div>
      </div>

      {/* Special Notes & Alerts */}
      {booking.specialNotes && Array.isArray(booking.specialNotes) && booking.specialNotes.length > 0 && (
        <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">⚠️ SPECIAL NOTES</h4>
          <ul className="space-y-1">
            {booking.specialNotes.map((note, index) => (
              <li key={index} className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Late Alert */}
      {booking.late && (
        <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">⚠️ LATE ({booking.lateBy} overdue)</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">Regular daycare visitor</p>
        </div>
      )}

      {/* Payment Info */}
      <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">Total</p>
            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
              ${((booking.totalCents || booking.totalAmount || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Status: {booking.paymentStatus === 'paid' || booking.balanceDueCents === 0 ? '✅ Paid in full' : '⚠️ Payment required'}
            </p>
          </div>
        </div>
      </div>

      {/* Customer History */}
      {booking.customerHistory && (
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📊 CUSTOMER HISTORY</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total visits:</span>
              <div className="font-semibold text-blue-900 dark:text-blue-100">{booking.customerHistory.totalVisits || 0}</div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Last visit:</span>
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                {booking.customerHistory.lastVisit ? format(new Date(booking.customerHistory.lastVisit), 'MMM d') : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Lifetime value:</span>
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                ${booking.customerHistory.lifetimeValue ? booking.customerHistory.lifetimeValue.toLocaleString() : '0'}
              </div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Rating:</span>
              <div className="font-semibold text-blue-900 dark:text-blue-100">
                ⭐ {booking.customerHistory.averageRating || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Activities (for checked-in bookings) */}
      {booking.status === 'checked_in' && booking.activities && Array.isArray(booking.activities) && booking.activities.length > 0 && (
        <div className="bg-purple-50 dark:bg-surface-primary border border-purple-200 dark:border-purple-900/30 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">📋 TODAY'S ACTIVITIES</h4>
          <div className="space-y-2">
            {booking.activities.map((activity, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-purple-800 dark:text-purple-200">{activity.time} - {activity.activity}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">📸 3 photos captured • View Photos</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onViewDetails(booking)}>
          <FileText className="w-4 h-4 mr-1" />
          View Details
        </Button>

        {booking.status === 'confirmed' && (
          <Button size="sm" variant="outline" onClick={() => onCheckIn(booking.id)}>
            <UserCheck className="w-4 h-4 mr-1" />
            Check In
          </Button>
        )}

        {booking.status === 'checked_in' && (
          <Button size="sm" variant="outline" onClick={() => onCheckOut(booking.id)}>
            <Home className="w-4 h-4 mr-1" />
            Check Out
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={() => onEdit(booking.id)}>
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>

        <Button size="sm" variant="outline" onClick={() => onContact(booking)}>
          <MessageCircle className="w-4 h-4 mr-1" />
          Contact
        </Button>

        {booking.paymentStatus !== 'paid' && (
          <Button size="sm" variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700">
            <DollarSign className="w-4 h-4 mr-1" />
            Pay Now
          </Button>
        )}

        <Button size="sm" variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" onClick={() => onCancel(booking.id)}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export default BookingCard;
