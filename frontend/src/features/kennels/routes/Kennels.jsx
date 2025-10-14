import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Building2, MapPin } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import KennelList from '../components/KennelList';
import KennelForm from '../components/KennelForm';
import { useKennels, useDeleteKennel } from '../api';
import { useTerminology } from '@/lib/terminology';
import { toast } from 'sonner';

const Kennels = () => {
  const terminology = useTerminology();
  const [showForm, setShowForm] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    building: '',
    isActive: ''
  });

  const { data: kennels = [], isLoading, error } = useKennels(filters);
  const deleteMutation = useDeleteKennel();

  useEffect(() => {
    if (error) {
      toast.error('Failed to load kennels');
    }
  }, [error]);

  const handleEdit = (kennel) => {
    setSelectedKennel(kennel);
    setShowForm(true);
  };

  const handleDelete = async (kennelId) => {
    if (!confirm('Are you sure you want to delete this kennel? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(kennelId);
      toast.success('Kennel deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete kennel');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedKennel(null);
  };

  const handleSuccess = () => {
    handleCloseForm();
    toast.success(selectedKennel ? 'Kennel updated successfully' : 'Kennel created successfully');
  };

  // Get unique buildings and types for filters
  const buildings = [...new Set(kennels.map(k => k.building).filter(Boolean))];
  const types = [...new Set(kennels.map(k => k.type))];

  // Filter kennels based on search and filters
  const filteredKennels = kennels.filter(kennel => {
    const matchesSearch = !filters.search || 
      kennel.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      kennel.location?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = !filters.type || kennel.type === filters.type;
    const matchesBuilding = !filters.building || kennel.building === filters.building;
    const matchesActive = filters.isActive === '' || kennel.isActive === (filters.isActive === 'true');
    
    return matchesSearch && matchesType && matchesBuilding && matchesActive;
  });

  // Group kennels by building/zone
  const groupedKennels = filteredKennels.reduce((acc, kennel) => {
    const key = kennel.building || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(kennel);
    return acc;
  }, {});

  return (
    <DashboardLayout
      title={`${terminology.kennel} Management`}
      description={`Manage your facility's ${terminology.kennel.toLowerCase()}s, rooms, and accommodations`}
      actions={
        <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add {terminology.kennel}
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            placeholder={`Search ${terminology.kennel.toLowerCase()}s...`}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {terminology[type.toLowerCase()] || type}
              </option>
            ))}
          </Select>
          <Select
            value={filters.building}
            onChange={(e) => setFilters(prev => ({ ...prev, building: e.target.value }))}
          >
            <option value="">All Buildings</option>
            {buildings.map(building => (
              <option key={building} value={building}>{building}</option>
            ))}
          </Select>
          <Select
            value={filters.isActive}
            onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total {terminology.kennel}s</p>
              <p className="text-2xl font-semibold">{kennels.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-muted/20" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Active</p>
              <p className="text-2xl font-semibold">{kennels.filter(k => k.isActive).length}</p>
            </div>
            <Badge variant="success" className="h-6">Active</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Capacity</p>
              <p className="text-2xl font-semibold">{kennels.reduce((sum, k) => sum + k.capacity, 0)}</p>
            </div>
            <div className="text-sm text-muted">pets</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Buildings</p>
              <p className="text-2xl font-semibold">{buildings.length || 1}</p>
            </div>
            <MapPin className="h-8 w-8 text-muted/20" />
          </div>
        </Card>
      </div>

      {/* Kennels List */}
      {isLoading ? (
        <Card>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted">Loading {terminology.kennel.toLowerCase()}s...</div>
          </div>
        </Card>
      ) : filteredKennels.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Building2 className="h-12 w-12 text-muted/20" />
            <p className="text-muted">
              {filters.search || filters.type || filters.building || filters.isActive !== '' 
                ? `No ${terminology.kennel.toLowerCase()}s match your filters`
                : `No ${terminology.kennel.toLowerCase()}s found. Add your first one!`
              }
            </p>
            {kennels.length === 0 && (
              <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add First {terminology.kennel}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedKennels).map(([building, buildingKennels]) => (
            <div key={building}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {building}
                <Badge variant="secondary">{buildingKennels.length}</Badge>
              </h3>
              <KennelList
                kennels={buildingKennels}
                onEdit={handleEdit}
                onDelete={handleDelete}
                terminology={terminology}
              />
            </div>
          ))}
        </div>
      )}

      {/* Kennel Form Modal */}
      {showForm && (
        <KennelForm
          kennel={selectedKennel}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          terminology={terminology}
        />
      )}
    </DashboardLayout>
  );
};

export default Kennels;
