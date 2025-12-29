/**
 * PetDetailsDrawer - Inspector-based pet detail panel
 * Uses the unified Inspector component family for consistent view-only display
 */

import { useState } from 'react';
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  Syringe, 
  AlertCircle,
  Edit2,
  Camera,
  Clock,
  Shield,
  PawPrint
} from 'lucide-react';
import {
  InspectorRoot,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useTimezoneUtils } from '@/lib/timezone';

const PetDetailsDrawer = ({ pet, isOpen, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const tz = useTimezoneUtils();

  if (!pet) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PawPrint },
    { id: 'medical', label: 'Medical', icon: Syringe },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: FileText },
  ];

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title={pet.name}
      subtitle={`${pet.breed || 'Unknown breed'} • ${pet.age || 'Unknown age'}`}
      variant="pet"
      size="lg"
    >
      {/* Tab Navigation */}
      <div className="border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-[var(--bb-space-4)] py-[var(--bb-space-3)] 
                  text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] 
                  border-b-2 transition-colors whitespace-nowrap
                  flex items-center gap-[var(--bb-space-2)]
                  ${activeTab === tab.id
                    ? 'border-[var(--bb-color-accent)] text-[var(--bb-color-accent)]'
                    : 'border-transparent text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-primary)]'
                  }
                `}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab pet={pet} />}
        {activeTab === 'medical' && <MedicalTab pet={pet} />}
        {activeTab === 'bookings' && <BookingsTab pet={pet} />}
        {activeTab === 'notes' && <NotesTab pet={pet} />}
      </div>

      {/* Footer Actions */}
      <InspectorFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" size="sm">
          <Camera className="h-4 w-4 mr-[var(--bb-space-2)]" />
          Add Photo
        </Button>
        <Button variant="primary" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-[var(--bb-space-2)]" />
          Edit
        </Button>
      </InspectorFooter>
    </InspectorRoot>
  );
};

// Overview Tab
const OverviewTab = ({ pet }) => {
  return (
    <>
      {/* Pet Photo and Basic Info */}
      <InspectorSection title="Basic Information" icon={PawPrint}>
        <div className="flex items-start gap-[var(--bb-space-4)]">
          <div className="flex-shrink-0">
            {pet.photo ? (
              <img 
                src={pet.photo} 
                alt={pet.name}
                className="w-24 h-24 rounded-[var(--bb-radius-lg)] object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-[var(--bb-color-bg-elevated)] rounded-[var(--bb-radius-lg)] flex items-center justify-center border border-[var(--bb-color-border-subtle)]">
                <PawPrint className="h-10 w-10 text-[var(--bb-color-text-muted)]" />
              </div>
            )}
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-[var(--bb-space-3)]">
            <InspectorField label="Species" value={pet.species} layout="stacked" />
            <InspectorField label="Breed" value={pet.breed} layout="stacked" />
            <InspectorField label="Age" value={pet.age} layout="stacked" />
            <InspectorField label="Weight" value={pet.weight ? `${pet.weight} lbs` : null} layout="stacked" />
            <InspectorField label="Color" value={pet.color} layout="stacked" />
            <InspectorField label="Gender" value={pet.gender} layout="stacked" />
          </div>
        </div>

        <div className="mt-[var(--bb-space-4)] pt-[var(--bb-space-4)] border-t border-[var(--bb-color-border-subtle)]">
          <div className="grid grid-cols-2 gap-[var(--bb-space-3)]">
            <InspectorField label="Microchip" value={pet.microchip || 'Not chipped'} layout="stacked" />
            <InspectorField label="Status" layout="stacked">
              <Badge variant={pet.status === 'active' ? 'success' : 'neutral'}>
                {pet.status || 'Unknown'}
              </Badge>
            </InspectorField>
          </div>
        </div>
      </InspectorSection>

      {/* Special Requirements */}
      {(pet.specialNeeds || pet.behaviorNotes) && (
        <InspectorSection>
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-warning-soft)] border border-[var(--bb-color-status-warning)] p-[var(--bb-space-4)]">
            <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-2)]">
              <AlertCircle className="h-5 w-5 text-[var(--bb-color-status-warning)]" />
              <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                Special Requirements
              </h4>
            </div>
            <div className="space-y-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
              {pet.specialNeeds && <p>{pet.specialNeeds}</p>}
              {pet.behaviorNotes && <p>{pet.behaviorNotes}</p>}
            </div>
          </div>
        </InspectorSection>
      )}

      {/* Owner Information */}
      <InspectorSection title="Owner Information" icon={User}>
        <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)] p-[var(--bb-space-4)]">
          <div className="flex items-start justify-between">
            <div className="space-y-[var(--bb-space-2)]">
              <div className="flex items-center gap-[var(--bb-space-2)]">
                <User className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                  {pet.owner?.name || 'Unknown'}
                </span>
              </div>
              {pet.owner?.phone && (
                <div className="flex items-center gap-[var(--bb-space-2)]">
                  <Phone className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                  <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    {pet.owner.phone}
                  </span>
                </div>
              )}
              {pet.owner?.email && (
                <div className="flex items-center gap-[var(--bb-space-2)]">
                  <Mail className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                  <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    {pet.owner.email}
                  </span>
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm">
              View Owner
            </Button>
          </div>
        </div>
      </InspectorSection>

      {/* Emergency Contact */}
      {pet.emergencyContact && (
        <InspectorSection title="Emergency Contact">
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-negative-soft)] border border-[var(--bb-color-status-negative)] p-[var(--bb-space-4)]">
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
              {pet.emergencyContact.name}
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              {pet.emergencyContact.phone} • {pet.emergencyContact.relationship}
            </p>
          </div>
        </InspectorSection>
      )}
    </>
  );
};

// Medical Tab
const MedicalTab = ({ pet }) => {
  const vaccinations = pet.vaccinations || [
    { name: 'Rabies', date: '2024-03-15', expires: '2025-03-15', status: 'current' },
    { name: 'DHPP', date: '2024-06-20', expires: '2025-06-20', status: 'current' },
    { name: 'Bordetella', date: '2024-01-10', expires: '2024-07-10', status: 'expired' },
  ];

  return (
    <>
      {/* Vaccination Status Summary */}
      <InspectorSection>
        <div className="flex items-center gap-[var(--bb-space-4)] p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]">
          <Shield className="h-8 w-8 text-[var(--bb-color-status-positive)]" />
          <div className="flex-1">
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
              Vaccination Status
            </p>
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              {vaccinations.filter(v => v.status === 'current').length} current, {vaccinations.filter(v => v.status !== 'current').length} needs update
            </p>
          </div>
          <Button variant="secondary" size="sm">
            <Syringe className="h-4 w-4 mr-[var(--bb-space-2)]" />
            Update Records
          </Button>
        </div>
      </InspectorSection>

      {/* Vaccinations List */}
      <InspectorSection title="Vaccinations" icon={Syringe}>
        <div className="space-y-[var(--bb-space-2)]">
          {vaccinations.map((vax, idx) => (
            <div 
              key={idx} 
              className="p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    {vax.name}
                  </p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    Given: {tz.formatShortDate(vax.date)} •
                    Expires: {tz.formatShortDate(vax.expires)}
                  </p>
                </div>
                <Badge variant={vax.status === 'current' ? 'success' : 'danger'}>
                  {vax.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </InspectorSection>

      {/* Medical Conditions */}
      {pet.medicalConditions && pet.medicalConditions.length > 0 && (
        <InspectorSection title="Medical Conditions" icon={AlertCircle}>
          <div className="space-y-[var(--bb-space-2)]">
            {pet.medicalConditions.map((condition, idx) => (
              <div key={idx} className="flex items-start gap-[var(--bb-space-2)]">
                <AlertCircle className="h-4 w-4 text-[var(--bb-color-status-warning)] mt-0.5" />
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    {condition.name}
                  </p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    {condition.notes}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}

      {/* Medications */}
      {pet.medications && pet.medications.length > 0 && (
        <InspectorSection title="Medications">
          <div className="space-y-[var(--bb-space-2)]">
            {pet.medications.map((med, idx) => (
              <div 
                key={idx} 
                className="p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                      {med.name}
                    </p>
                    <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                      {med.dosage} • {med.frequency}
                    </p>
                  </div>
                  <Badge variant="neutral">{med.administeredBy}</Badge>
                </div>
              </div>
            ))}
          </div>
        </InspectorSection>
      )}
    </>
  );
};

// Bookings Tab
const BookingsTab = ({ pet }) => {
  const bookings = pet.bookings || [
    { id: 1, service: 'Boarding', dates: 'Mar 15-18, 2024', status: 'completed', total: 180 },
    { id: 2, service: 'Daycare', dates: 'Mar 20, 2024', status: 'upcoming', total: 45 },
  ];

  return (
    <>
      <InspectorSection>
        <div className="flex items-center justify-between">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            Total bookings: {bookings.length} • Revenue: ${bookings.reduce((acc, b) => acc + b.total, 0)}
          </p>
          <Button variant="secondary" size="sm">
            <Calendar className="h-4 w-4 mr-[var(--bb-space-2)]" />
            New Booking
          </Button>
        </div>
      </InspectorSection>

      <InspectorSection title="Booking History" icon={Calendar}>
        <div className="space-y-[var(--bb-space-2)]">
          {bookings.map(booking => (
            <div 
              key={booking.id} 
              className="p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    {booking.service}
                  </p>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                    {booking.dates}
                  </p>
                </div>
                <div className="flex items-center gap-[var(--bb-space-3)]">
                  <Badge variant={
                    booking.status === 'completed' ? 'neutral' : 
                    booking.status === 'upcoming' ? 'info' : 'warning'
                  }>
                    {booking.status}
                  </Badge>
                  <span className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    ${booking.total}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </InspectorSection>
    </>
  );
};

// Notes Tab
const NotesTab = ({ pet }) => {
  const notes = pet.notes || [
    { date: '2024-03-18', author: 'Emma W.', note: 'Did great during boarding! Played well with others.', type: 'positive' },
    { date: '2024-03-15', author: 'Jake M.', note: 'Needs to be separated during feeding time - resource guarding.', type: 'warning' },
  ];

  return (
    <>
      <InspectorSection>
        <div className="flex justify-end">
          <Button variant="secondary" size="sm">
            <FileText className="h-4 w-4 mr-[var(--bb-space-2)]" />
            Add Note
          </Button>
        </div>
      </InspectorSection>

      <InspectorSection title="Notes" icon={FileText}>
        <div className="space-y-[var(--bb-space-3)]">
          {notes.map((note, idx) => (
            <div 
              key={idx} 
              className={`
                p-[var(--bb-space-4)] rounded-[var(--bb-radius-lg)] border
                ${note.type === 'warning' 
                  ? 'bg-[var(--bb-color-status-warning-soft)] border-[var(--bb-color-status-warning)]' 
                  : 'bg-[var(--bb-color-bg-elevated)] border-[var(--bb-color-border-subtle)]'
                }
              `}
            >
              <div className="flex items-start justify-between mb-[var(--bb-space-2)]">
                <div className="flex items-center gap-[var(--bb-space-2)]">
                  <User className="h-4 w-4 text-[var(--bb-color-text-muted)]" />
                  <span className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">
                    {note.author}
                  </span>
                </div>
                <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {note.date}
                </span>
              </div>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                {note.note}
              </p>
            </div>
          ))}
        </div>
      </InspectorSection>
    </>
  );
};

export default PetDetailsDrawer;
