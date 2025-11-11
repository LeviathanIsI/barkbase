import { useState, useMemo } from 'react';
import { Plus, Search, Building, MapPin, Settings, Home, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import KennelForm from '../components/KennelForm';
import { useKennels, useDeleteKennel } from '../api';
import { useTerminology } from '@/lib/terminology';
import toast from 'react-hot-toast';

const Kennels = () => {
  const terminology = useTerminology();
  const [showForm, setShowForm] = useState(false);
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: kennels = [], isLoading, error } = useKennels();
  const deleteMutation = useDeleteKennel();

  // Calculate enhanced kennel data with metrics
  const kennelsWithMetrics = useMemo(() => {
    return kennels.map((kennel) => ({
      ...kennel,
      utilizationRate: kennel.capacity > 0 ? Math.round((kennel.occupied || 0) / kennel.capacity * 100) : 0,
      status: kennel.isActive ? 'Active' : 'Inactive',
    }));
  }, [kennels]);

  // Filter kennels based on search and status
  const filteredKennels = useMemo(() => {
    return kennelsWithMetrics.filter(kennel => {
      const matchesSearch = !searchTerm ||
        kennel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kennel.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kennel.building?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && kennel.isActive) ||
        (statusFilter === 'INACTIVE' && !kennel.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [kennelsWithMetrics, searchTerm, statusFilter]);

  // Calculate stats
  const stats = {
    total: kennels.length,
    active: kennels.filter(k => k.isActive).length,
    totalCapacity: kennels.reduce((sum, k) => sum + (k.capacity || 0), 0),
    occupiedCapacity: kennels.reduce((sum, k) => sum + (k.occupied || 0), 0),
    buildings: [...new Set(kennels.map(k => k.building).filter(Boolean))].length || 1,
  };

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

  if (error) {
    return (
      <div>
        <PageHeader title="Kennels" breadcrumb="Home > Settings > Kennels" />
        <Card>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Error Loading Kennels</h3>
            <p className="text-gray-600 dark:text-text-secondary">Unable to load kennel data. Please try again.</p>
          </div>
        </Card>
      </div>
    );
  }

  const KennelCard = ({ kennel }) => {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-600 dark:bg-primary-700 rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{kennel.name}</h3>
                <p className="text-sm text-gray-600 dark:text-text-secondary">{kennel.location || 'No location'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary">
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span>{kennel.building || 'No building'}</span>
              </div>
              <Badge variant={kennel.isActive ? 'success' : 'neutral'}>
                {kennel.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEdit(kennel)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{kennel.capacity || 0}</p>
            <p className="text-xs text-gray-600 dark:text-text-secondary">Capacity</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success-600">{kennel.occupied || 0}</p>
            <p className="text-xs text-gray-600 dark:text-text-secondary">Occupied</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-warning-600">{kennel.utilizationRate}%</p>
            <p className="text-xs text-gray-600 dark:text-text-secondary">Utilization</p>
          </div>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            className="bg-primary-600 dark:bg-primary-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${kennel.utilizationRate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-text-secondary">
          <span>Type: {kennel.type}</span>
          <span>{(kennel.capacity || 0) - (kennel.occupied || 0)} spots available</span>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Settings > Kennels"
        title="Kennel Management"
        actions={
          <>
            <Button variant="outline" size="sm">
              Settings
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Kennel
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Kennels</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Active Kennels</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Capacity</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.totalCapacity}</p>
                  <p className="text-xs text-gray-600 dark:text-text-secondary mt-1">{stats.occupiedCapacity} occupied</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Buildings</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.buildings}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-text-secondary" />
              <input
                type="text"
                placeholder="Search kennels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-text-secondary">
            Showing {filteredKennels.length} of {kennels.length} kennels
          </div>
        </div>
      </Card>

      {/* Kennels Grid */}
      <Card>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        ) : filteredKennels.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-600 dark:text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">No Kennels Found</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first kennel.'}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Kennel
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredKennels.map((kennel) => (
              <KennelCard key={kennel.recordId} kennel={kennel} />
            ))}
          </div>
        )}
      </Card>

      {/* Kennel Form Modal */}
      {showForm && (
        <KennelForm
          kennel={selectedKennel}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
          terminology={terminology}
        />
      )}
    </div>
  );
};

export default Kennels;
