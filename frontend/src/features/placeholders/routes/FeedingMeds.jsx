import { useState, useMemo } from 'react';
import { Pill, Utensils, Clock, AlertTriangle, CheckCircle, Plus, Search, Filter, Calendar, User, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

// Mock data for demonstration
const mockFeedingSchedules = [
  {
    id: '1',
    petName: 'Bella',
    petBreed: 'Golden Retriever',
    ownerName: 'Sarah Johnson',
    feedingTime: '08:00',
    foodType: 'Premium Dry Food',
    portion: '2 cups',
    status: 'completed',
    nextFeeding: '12:00',
    dietaryNotes: 'Allergic to chicken'
  },
  {
    id: '2',
    petName: 'Max',
    petBreed: 'German Shepherd',
    ownerName: 'Mike Wilson',
    feedingTime: '08:30',
    foodType: 'Wet Food Mix',
    portion: '1.5 cups',
    status: 'pending',
    nextFeeding: '12:30',
    dietaryNotes: 'Senior formula'
  },
  {
    id: '3',
    petName: 'Luna',
    petBreed: 'Pug',
    ownerName: 'Emma Davis',
    feedingTime: '09:00',
    foodType: 'Grain-Free Kibble',
    portion: '1 cup',
    status: 'overdue',
    nextFeeding: '13:00',
    dietaryNotes: 'Weight management'
  },
];

const mockMedications = [
  {
    id: '1',
    petName: 'Charlie',
    medication: 'Heartworm Prevention',
    dosage: '1 tablet',
    frequency: 'Monthly',
    nextDose: '2024-01-15',
    status: 'due',
    administeredBy: null
  },
  {
    id: '2',
    petName: 'Lucy',
    medication: 'Flea Treatment',
    dosage: '1 application',
    frequency: 'Monthly',
    nextDose: '2024-01-10',
    status: 'completed',
    administeredBy: 'Dr. Smith'
  },
  {
    id: '3',
    petName: 'Bella',
    medication: 'Joint Supplement',
    dosage: '2 chews',
    frequency: 'Daily',
    nextDose: 'Today',
    status: 'due',
    administeredBy: null
  },
];

const FeedingCard = ({ feeding }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-[#4CAF50] dark:text-green-400';
      case 'pending': return 'text-[#FF9800] dark:text-orange-400';
      case 'overdue': return 'text-[#F44336] dark:text-red-400';
      default: return 'text-[#64748B] dark:text-text-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-[#263238] dark:text-text-primary">{feeding.petName}</h3>
            <Badge variant="secondary">{feeding.petBreed}</Badge>
          </div>
          <p className="text-sm text-[#64748B] dark:text-text-secondary">{feeding.ownerName}</p>
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor(feeding.status)}`}>
          {getStatusIcon(feeding.status)}
          <span className="text-sm capitalize">{feeding.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm font-medium text-[#263238] dark:text-text-primary">{feeding.foodType}</p>
          <p className="text-xs text-[#64748B] dark:text-text-secondary">Portion: {feeding.portion}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-[#263238] dark:text-text-primary">{feeding.feedingTime}</p>
          <p className="text-xs text-[#64748B] dark:text-text-secondary">Next: {feeding.nextFeeding}</p>
        </div>
      </div>

      {feeding.dietaryNotes && (
        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-surface-primary rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <p className="text-xs text-yellow-800">{feeding.dietaryNotes}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4">
        <Button size="sm" variant="outline">
          Edit Schedule
        </Button>
        <Button size="sm" variant={feeding.status === 'pending' ? 'primary' : 'secondary'}>
          {feeding.status === 'pending' ? 'Log Feeding' : 'View History'}
        </Button>
      </div>
    </Card>
  );
};

const MedicationCard = ({ medication }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-surface-primary border-green-200 dark:border-green-900/30 text-green-800';
      case 'due': return 'bg-orange-50 dark:bg-surface-primary border-orange-200 text-orange-800';
      case 'overdue': return 'bg-red-50 dark:bg-surface-primary border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-200';
      default: return 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border text-gray-800 dark:text-text-primary';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(medication.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-[#263238] dark:text-text-primary">{medication.petName}</h4>
          <p className="text-sm text-[#64748B] dark:text-text-secondary">{medication.medication}</p>
        </div>
        <Badge variant={medication.status === 'completed' ? 'success' : medication.status === 'due' ? 'warning' : 'danger'}>
          {medication.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm font-medium text-[#263238] dark:text-text-primary">{medication.dosage}</p>
          <p className="text-xs text-[#64748B] dark:text-text-secondary">{medication.frequency}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-[#263238] dark:text-text-primary">Next: {medication.nextDose}</p>
          {medication.administeredBy && (
            <p className="text-xs text-[#64748B] dark:text-text-secondary">By: {medication.administeredBy}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {medication.status === 'due' && (
          <Button size="sm" variant="primary">
            Administer
          </Button>
        )}
        <Button size="sm" variant="outline">
          View History
        </Button>
      </div>
    </div>
  );
};

const FeedingMeds = () => {
  const [activeTab, setActiveTab] = useState('feeding');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFeedingSchedules = useMemo(() => {
    return mockFeedingSchedules.filter(feeding =>
      feeding.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feeding.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredMedications = useMemo(() => {
    return mockMedications.filter(med =>
      med.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.medication.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const feedingStats = {
    total: mockFeedingSchedules.length,
    completed: mockFeedingSchedules.filter(f => f.status === 'completed').length,
    pending: mockFeedingSchedules.filter(f => f.status === 'pending').length,
    overdue: mockFeedingSchedules.filter(f => f.status === 'overdue').length,
  };

  const medicationStats = {
    total: mockMedications.length,
    due: mockMedications.filter(m => m.status === 'due').length,
    completed: mockMedications.filter(m => m.status === 'completed').length,
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Intake > Feeding & Meds"
        title="Feeding & Medications"
        actions={
          <>
            <div className="flex items-center gap-2 mr-4">
              <Button
                variant={activeTab === 'feeding' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('feeding')}
              >
                <Utensils className="h-4 w-4 mr-2" />
                Feeding
              </Button>
              <Button
                variant={activeTab === 'medications' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('medications')}
              >
                <Pill className="h-4 w-4 mr-2" />
                Medications
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {activeTab === 'feeding' ? (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Total Pets</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{feedingStats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Utensils className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Completed</p>
                  <p className="text-2xl font-bold text-[#4CAF50] dark:text-green-400">{feedingStats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Pending</p>
                  <p className="text-2xl font-bold text-[#FF9800] dark:text-orange-400">{feedingStats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Overdue</p>
                  <p className="text-2xl font-bold text-[#F44336] dark:text-red-400">{feedingStats.overdue}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Total Medications</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{medicationStats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Pill className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Due Today</p>
                  <p className="text-2xl font-bold text-[#FF9800] dark:text-orange-400">{medicationStats.due}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Completed</p>
                  <p className="text-2xl font-bold text-[#4CAF50] dark:text-green-400">{medicationStats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Compliance Rate</p>
                  <p className="text-2xl font-bold text-[#9C27B0] dark:text-purple-400">96%</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Search */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-text-secondary" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'feeding' ? 'pets' : 'medications'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* Content */}
      {activeTab === 'feeding' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFeedingSchedules.map((feeding) => (
            <FeedingCard key={feeding.id} feeding={feeding} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMedications.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#64748B] dark:text-text-secondary mt-0.5" />
          <div>
            <h3 className="font-semibold text-[#263238] dark:text-text-primary mb-1">Management Guidelines</h3>
            <ul className="text-sm text-[#64748B] dark:text-text-secondary space-y-1">
              <li>• Always check dietary restrictions before feeding</li>
              <li>• Administer medications at the correct time and dosage</li>
              <li>• Log all feedings and medication administration</li>
              <li>• Contact owner for any changes in pet's condition</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FeedingMeds;
