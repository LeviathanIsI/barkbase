import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, Clock, Home, Search, Settings, List, Activity } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import EnhancedDaycareStats from '../components/EnhancedDaycareStats';
import QuickActionsBar from '../components/QuickActionsBar';
import PetCard from '../components/PetCard';
import ExpressCheckInModal from '../components/ExpressCheckInModal';
import QRCheckInModal from '../components/QRCheckInModal';
import PhotoCheckInModal from '../components/PhotoCheckInModal';
import BatchCheckInModal from '../components/BatchCheckInModal';
import ExpressCheckOutModal from '../components/ExpressCheckOutModal';
import CommunicationPanel from '../components/CommunicationPanel';
import FilterSortPanel from '../components/FilterSortPanel';
import DailySummaryDashboard from '../components/DailySummaryDashboard';
import StaffAssignmentView from '../components/StaffAssignmentView';

const DaycareCheckinOverview = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState('cards'); // cards, timeline, staff
  const [selectedPet, setSelectedPet] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: ['scheduled', 'checked_in', 'checked_out'],
    serviceType: ['daycare'],
    flags: [],
    sortBy: 'scheduled_time'
  });

  // Mock data - in real app this would come from API
  const [pets, setPets] = useState([
    {
      id: '1',
      name: 'Bella',
      breed: 'Golden Retriever',
      age: 3,
      weight: 65,
      owner: {
        name: 'Sarah Johnson',
        phone: '+1 (555) 123-4567',
        email: 'sarah.j@email.com'
      },
      scheduledTime: '09:00 AM',
      checkInTime: null,
      checkOutTime: null,
      status: 'scheduled',
      late: true,
      lateBy: '30 mins',
      service: 'daycare',
      kennel: 'K-1',
      medication: {
        required: true,
        name: 'Apoquel 16mg',
        schedule: 'Once daily with food',
        time: '2:00 PM'
      },
      specialNotes: [
        'Friendly with other dogs',
        'Anxious with thunderstorms',
        'Bring own toys (yellow ball in cubby)'
      ],
      vaccinationsCurrent: true,
      lastVisit: 'Regular daycare visitor',
      paymentStatus: 'paid',
      membership: true
    },
    {
      id: '2',
      name: 'Max',
      breed: 'German Shepherd',
      age: 2,
      weight: 80,
      owner: {
        name: 'Mike Wilson',
        phone: '+1 (555) 234-5678',
        email: 'mike.w@email.com'
      },
      scheduledTime: '09:00 AM',
      checkInTime: '08:45 AM',
      checkOutTime: null,
      status: 'checked_in',
      service: 'daycare',
      kennel: 'K-3',
      medication: null,
      specialNotes: ['First time visitor', 'Watch behavior'],
      vaccinationsCurrent: true,
      lastVisit: 'First time',
      paymentStatus: 'paid',
      membership: false
    },
    {
      id: '3',
      name: 'Luna',
      breed: 'Pug',
      age: 4,
      weight: 18,
      owner: {
        name: 'Emma Davis',
        phone: '+1 (555) 345-6789',
        email: 'emma.d@email.com'
      },
      scheduledTime: '09:00 AM',
      checkInTime: '09:15 AM',
      checkOutTime: '05:30 PM',
      status: 'checked_out',
      service: 'daycare',
      kennel: 'K-5',
      medication: null,
      specialNotes: ['Needs extra attention'],
      vaccinationsCurrent: true,
      lastVisit: 'Needs extra attention',
      paymentStatus: 'paid',
      membership: true
    },
    {
      id: '4',
      name: 'Charlie',
      breed: 'Beagle',
      age: 1,
      weight: 25,
      owner: {
        name: 'Tom Brown',
        phone: '+1 (555) 456-7890',
        email: 'tom.b@email.com'
      },
      scheduledTime: '08:30 AM',
      checkInTime: '08:30 AM',
      checkOutTime: null,
      status: 'checked_in',
      service: 'daycare',
      kennel: 'K-2',
      medication: null,
      specialNotes: ['Brings own toys'],
      vaccinationsCurrent: true,
      lastVisit: 'Brings own toys',
      paymentStatus: 'paid',
      membership: false
    },
    {
      id: '5',
      name: 'Lucy',
      breed: 'Siamese Cat',
      age: 2,
      weight: 12,
      owner: {
        name: 'Anna Smith',
        phone: '+1 (555) 567-8901',
        email: 'anna.s@email.com'
      },
      scheduledTime: '10:00 AM',
      checkInTime: null,
      checkOutTime: null,
      status: 'scheduled',
      service: 'daycare',
      kennel: 'CAT-1',
      medication: null,
      specialNotes: ['Indoor only'],
      vaccinationsCurrent: true,
      lastVisit: 'Indoor only',
      paymentStatus: 'pending',
      membership: false
    }
  ]);

  // Set document title
  useEffect(() => {
    document.title = 'Daycare Check-in | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleCheckIn = (petId) => {
    setSelectedPet(pets.find(p => p.id === petId));
    setShowCheckInModal(true);
  };

  const handleCheckOut = (petId) => {
    setSelectedPet(pets.find(p => p.id === petId));
    setShowCheckOutModal(true);
  };

  const handleCommunication = (pet) => {
    setSelectedPet(pet);
    setShowCommunication(true);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Filter and sort pets
  const filteredAndSortedPets = pets
    .filter(pet => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return pet.name.toLowerCase().includes(term) ||
               pet.owner.name.toLowerCase().includes(term) ||
               pet.breed.toLowerCase().includes(term);
      }
      return filters.status.includes(pet.status);
    })
    .sort((a, b) => {
      // Simple sort logic
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      {/* Page Header with View Toggle */}
      <PageHeader
        breadcrumb="Home > Intake > Daycare Check-in"
        title="Daycare Check-in"
        subtitle="Streamlined check-in/out operations with QR codes and photo recognition"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
              <Button
                variant={activeView === 'cards' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('cards')}
                className="px-3"
              >
                <List className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={activeView === 'timeline' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('timeline')}
                className="px-3"
              >
                <Activity className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={activeView === 'staff' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('staff')}
                className="px-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Staff
              </Button>
            </div>

            {/* Action Buttons */}
            <Button variant="outline" size="sm" onClick={() => setShowFilters(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        }
      />

      {/* Enhanced Stats Dashboard */}
      <EnhancedDaycareStats pets={pets} currentDate={currentDate} />

      {/* Quick Actions Bar */}
      <QuickActionsBar
        onQRScan={() => setShowQRModal(true)}
        onPhotoCheck={() => setShowPhotoModal(true)}
        onBatchCheckIn={() => setShowBatchModal(true)}
        onWalkIn={() => {/* Handle walk-in */}}
      />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
            <input
              type="text"
              placeholder="Search pets, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            {filteredAndSortedPets.length} of {pets.length} pets
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeView === 'cards' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedPets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onCheckIn={() => handleCheckIn(pet.id)}
                onCheckOut={() => handleCheckOut(pet.id)}
                onCommunication={() => handleCommunication(pet)}
              />
            ))}
          </div>
        )}

        {activeView === 'timeline' && (
          <DailySummaryDashboard pets={pets} currentDate={currentDate} />
        )}

        {activeView === 'staff' && (
          <StaffAssignmentView pets={filteredAndSortedPets} />
        )}
      </div>

      {/* Modals */}
      <ExpressCheckInModal
        pet={selectedPet}
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
      />

      <ExpressCheckOutModal
        pet={selectedPet}
        isOpen={showCheckOutModal}
        onClose={() => setShowCheckOutModal(false)}
      />

      <QRCheckInModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

      <PhotoCheckInModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      />

      <BatchCheckInModal
        pets={filteredAndSortedPets.filter(p => p.status === 'scheduled')}
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
      />

      <CommunicationPanel
        pet={selectedPet}
        isOpen={showCommunication}
        onClose={() => setShowCommunication(false)}
      />

      <FilterSortPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};

export default DaycareCheckinOverview;
