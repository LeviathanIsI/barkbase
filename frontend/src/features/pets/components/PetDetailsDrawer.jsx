import { useState } from 'react';
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Syringe, 
  AlertCircle,
  Edit2,
  Camera,
  DollarSign,
  Clock,
  Shield,
  PawPrint
} from 'lucide-react';
import { DetailDrawer, DrawerTabPanel } from '@/components/ui/SlideOutDrawer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

/**
 * PetDetailsDrawer - Example of drawer-first pattern
 * Shows pet details without navigating to a new page
 * Keeps context visible and allows quick actions
 */

const PetDetailsDrawer = ({ pet, isOpen, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!pet) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PawPrint },
    { id: 'medical', label: 'Medical', icon: Syringe, count: 5 },
    { id: 'bookings', label: 'Bookings', icon: Calendar, count: 12 },
    { id: 'notes', label: 'Notes', icon: FileText, count: 3 },
  ];

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={pet.name}
      subtitle={`${pet.breed} • ${pet.age}`}
      size="lg"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="secondary" size="sm">
            <Camera className="h-4 w-4 mr-2" />
            Add Photo
          </Button>
        </>
      }
    >
      <DrawerTabPanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'overview' && <OverviewTab pet={pet} />}
        {activeTab === 'medical' && <MedicalTab pet={pet} />}
        {activeTab === 'bookings' && <BookingsTab pet={pet} />}
        {activeTab === 'notes' && <NotesTab pet={pet} />}
      </DrawerTabPanel>
    </DetailDrawer>
  );
};

// Overview Tab
const OverviewTab = ({ pet }) => {
  return (
    <div className="space-y-6">
      {/* Pet Photo and Basic Info */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          {pet.photo ? (
            <img 
              src={pet.photo} 
              alt={pet.name}
              className="w-32 h-32 rounded-lg object-cover"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-200 dark:bg-surface-border rounded-lg flex items-center justify-center">
              <PawPrint className="h-12 w-12 text-gray-400 dark:text-text-tertiary" />
            </div>
          )}
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label="Species" value={pet.species} />
          <InfoItem label="Breed" value={pet.breed} />
          <InfoItem label="Age" value={pet.age} />
          <InfoItem label="Weight" value={`${pet.weight} lbs`} />
          <InfoItem label="Color" value={pet.color} />
          <InfoItem label="Gender" value={pet.gender} />
          <InfoItem label="Microchip" value={pet.microchip || 'Not chipped'} />
          <InfoItem label="Status" value={
            <Badge variant={pet.status === 'active' ? 'success' : 'secondary'}>
              {pet.status}
            </Badge>
          } />
        </div>
      </div>

      {/* Special Requirements */}
      {(pet.specialNeeds || pet.behaviorNotes) && (
        <Card className="p-4 bg-warning-50 border-warning-200">
          <h3 className="font-medium text-warning-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Special Requirements
          </h3>
          <div className="space-y-2 text-sm text-warning-800">
            {pet.specialNeeds && <p>{pet.specialNeeds}</p>}
            {pet.behaviorNotes && <p>{pet.behaviorNotes}</p>}
          </div>
        </Card>
      )}

      {/* Owner Information */}
      <div>
        <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Owner Information</h3>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                <span className="font-medium">{pet.owner?.name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                <span className="text-sm text-gray-600 dark:text-text-secondary">{pet.owner?.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                <span className="text-sm text-gray-600 dark:text-text-secondary">{pet.owner?.email}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              View Owner
            </Button>
          </div>
        </Card>
      </div>

      {/* Emergency Contact */}
      {pet.emergencyContact && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Emergency Contact</h3>
          <Card className="p-4 border-error-200 bg-error-50">
            <div className="space-y-2">
              <p className="font-medium text-error-900">{pet.emergencyContact.name}</p>
              <p className="text-sm text-error-700">
                {pet.emergencyContact.phone} • {pet.emergencyContact.relationship}
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Medical Tab
const MedicalTab = ({ pet }) => {
  const vaccinations = [
    { name: 'Rabies', date: '2024-03-15', expires: '2025-03-15', status: 'current' },
    { name: 'DHPP', date: '2024-06-20', expires: '2025-06-20', status: 'current' },
    { name: 'Bordetella', date: '2024-01-10', expires: '2024-07-10', status: 'expired' },
  ];

  return (
    <div className="space-y-6">
      {/* Vaccination Status Summary */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
        <Shield className="h-8 w-8 text-success-600" />
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-text-primary">Vaccination Status</p>
          <p className="text-sm text-gray-600 dark:text-text-secondary">2 current, 1 needs update</p>
        </div>
        <Button variant="secondary" size="sm">
          <Syringe className="h-4 w-4 mr-2" />
          Update Records
        </Button>
      </div>

      {/* Vaccinations List */}
      <div>
        <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Vaccinations</h3>
        <div className="space-y-2">
          {vaccinations.map((vax, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{vax.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">
                    Given: {new Date(vax.date).toLocaleDateString()} • 
                    Expires: {new Date(vax.expires).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  variant={vax.status === 'current' ? 'success' : 'error'}
                  className="capitalize"
                >
                  {vax.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Medical Conditions */}
      {pet.medicalConditions && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Medical Conditions</h3>
          <Card className="p-4 space-y-2">
            {pet.medicalConditions.map((condition, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-text-primary">{condition.name}</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{condition.notes}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Medications */}
      {pet.medications && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Medications</h3>
          <div className="space-y-2">
            {pet.medications.map((med, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-text-primary">{med.name}</p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">
                      {med.dosage} • {med.frequency}
                    </p>
                  </div>
                  <Badge variant="secondary">{med.administeredBy}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Bookings Tab
const BookingsTab = ({ pet }) => {
  const bookings = [
    { 
      id: 1, 
      service: 'Boarding', 
      dates: 'Mar 15-18, 2024', 
      status: 'completed',
      total: 180
    },
    { 
      id: 2, 
      service: 'Daycare', 
      dates: 'Mar 20, 2024', 
      status: 'upcoming',
      total: 45
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-text-secondary">
          Total bookings: 12 • Revenue: $1,245
        </p>
        <Button variant="secondary" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      <div className="space-y-2">
        {bookings.map(booking => (
          <Card key={booking.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">{booking.service}</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">{booking.dates}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={
                  booking.status === 'completed' ? 'secondary' : 
                  booking.status === 'upcoming' ? 'primary' : 'warning'
                }>
                  {booking.status}
                </Badge>
                <span className="font-medium">${booking.total}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Notes Tab
const NotesTab = ({ pet }) => {
  const notes = [
    { 
      date: '2024-03-18', 
      author: 'Emma W.', 
      note: 'Max did great during boarding! Played well with others.',
      type: 'positive'
    },
    { 
      date: '2024-03-15', 
      author: 'Jake M.', 
      note: 'Needs to be separated during feeding time - resource guarding.',
      type: 'warning'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      <div className="space-y-3">
        {notes.map((note, idx) => (
          <Card 
            key={idx} 
            className={`p-4 ${
              note.type === 'warning' ? 'bg-warning-50 border-warning-200' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 dark:text-text-tertiary" />
                <span className="text-sm font-medium text-gray-900 dark:text-text-primary">{note.author}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-text-secondary">{note.date}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-text-primary">{note.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Utility component
const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-text-secondary">{label}</p>
    <p className="font-medium text-gray-900 dark:text-text-primary">{value}</p>
  </div>
);

export default PetDetailsDrawer;


