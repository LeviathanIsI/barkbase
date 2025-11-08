import { Clock, CheckCircle, Phone, Mail, User, AlertTriangle, Pill, Calendar, FileText, MessageCircle, Home } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PetCard = ({ pet, onCheckIn, onCheckOut, onCommunication }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'checked_in': return 'bg-green-100 dark:bg-surface-secondary border-green-300 text-green-800';
      case 'checked_out': return 'bg-gray-100 dark:bg-surface-secondary border-gray-300 dark:border-surface-border text-gray-800 dark:text-text-primary';
      case 'scheduled': return 'bg-blue-100 dark:bg-surface-secondary border-blue-300 text-blue-800 dark:text-blue-200';
      default: return 'bg-gray-100 dark:bg-surface-secondary border-gray-300 dark:border-surface-border text-gray-800 dark:text-text-primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'checked_in': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'checked_out': return <Home className="w-4 h-4 text-gray-600 dark:text-text-secondary" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default: return <Clock className="w-4 h-4 text-gray-600 dark:text-text-secondary" />;
    }
  };

  const getStatusBadgeColor = () => {
    if (pet.late) return 'bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 border-red-300';
    return getStatusColor(pet.status);
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200">
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {pet.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary">{pet.name}</h3>
              {pet.late && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  LATE ({pet.lateBy})
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-text-secondary">{pet.breed} • {pet.age} yrs • {pet.weight} lbs</p>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusBadgeColor()}`}>
          {getStatusIcon(pet.status)}
          <span className="capitalize">{pet.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Owner Info */}
      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-900 dark:text-text-primary">{pet.owner.name}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onCommunication(pet)}>
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
            <Button size="sm" variant="outline" onClick={() => onCommunication(pet)}>
              <MessageCircle className="w-3 h-3 mr-1" />
              SMS
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary">
          <div className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            <span>{pet.owner.phone}</span>
          </div>
          <div className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            <span>{pet.owner.email}</span>
          </div>
        </div>
      </div>

      {/* Schedule Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">Scheduled</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">{pet.scheduledTime}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide">
            {pet.status === 'checked_out' ? 'Checked Out' : 'Check-in'}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-text-primary">
            {pet.status === 'checked_out' ? pet.checkOutTime :
             pet.checkInTime || 'Not checked in'}
          </p>
        </div>
      </div>

      {/* Status-specific alerts */}
      {pet.late && (
        <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">⚠️ LATE ({pet.lateBy} overdue)</span>
          </div>
          <p className="text-sm text-red-700 mt-1">Regular daycare visitor</p>
        </div>
      )}

      {/* Special Notes */}
      {pet.specialNotes && pet.specialNotes.length > 0 && (
        <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ SPECIAL NOTES</h4>
          <ul className="space-y-1">
            {pet.specialNotes.map((note, index) => (
              <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                <span className="text-yellow-600 mt-0.5">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Medication Alert */}
      {pet.medication && (
        <div className="bg-orange-50 dark:bg-surface-primary border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-900">
              💊 Medication: {pet.medication.name}
            </span>
          </div>
          <p className="text-sm text-orange-800">{pet.medication.schedule}</p>
          <p className="text-xs text-orange-700 mt-1">
            Last given: {pet.medication.lastGiven} by {pet.medication.administeredBy}
          </p>
        </div>
      )}

      {/* Health & Vaccination Status */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div>
          <div className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide mb-1">Vaccinations</div>
          <div className="text-green-600 font-medium">
            {pet.vaccinationsCurrent ? '✅ Current' : '❌ Due'}
          </div>
          {pet.vaccinationsCurrent && (
            <div className="text-xs text-gray-600 dark:text-text-secondary">Expires Apr 2026</div>
          )}
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide mb-1">Medications</div>
          <div className={`font-medium ${pet.medication ? 'text-orange-600' : 'text-green-600'}`}>
            {pet.medication ? '1 scheduled' : '✅ None'}
          </div>
          <div className="text-xs text-gray-600 dark:text-text-secondary">today</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-text-secondary uppercase tracking-wide mb-1">Health</div>
          <div className="text-green-600 font-medium">✅ No incidents</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {pet.status === 'scheduled' && (
          <Button className="flex-1" onClick={() => onCheckIn()}>
            ✓ Check In Now
          </Button>
        )}
        {pet.status === 'checked_in' && (
          <Button className="flex-1" onClick={() => onCheckOut()}>
            🏠 Check Out
          </Button>
        )}
        {pet.status === 'checked_out' && (
          <div className="flex-1 text-center py-2 text-green-600 font-medium">
            ✅ Completed
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => onCommunication(pet)}>
          <MessageCircle className="w-4 h-4 mr-1" />
          Contact
        </Button>

        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-1" />
          Profile
        </Button>
      </div>

      {/* Quick Actions Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
        <div className="text-xs text-gray-600 dark:text-text-secondary mb-2">QUICK ACTIONS:</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" className="text-xs">
            ✓ Check In Now
          </Button>
          <Button size="sm" variant="ghost" className="text-xs">
            📞 Call Owner
          </Button>
          <Button size="sm" variant="ghost" className="text-xs">
            📝 Add Note
          </Button>
          <Button size="sm" variant="ghost" className="text-xs">
            📋 View Full Profile
          </Button>
          <Button size="sm" variant="ghost" className="text-xs">
            📅 View History
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PetCard;
