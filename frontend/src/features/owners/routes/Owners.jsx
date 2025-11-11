import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Phone, DollarSign, Calendar, Plus, Search, Filter, Mail, Heart, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useOwnersQuery, useCreateOwnerMutation } from '../api';
import OwnerFormModal from '../components/OwnerFormModal';
import { formatCurrency } from '@/lib/utils';

const Owners = () => {
  const navigate = useNavigate();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: ownersData, isLoading, error } = useOwnersQuery();
  const createOwnerMutation = useCreateOwnerMutation();
  const owners = useMemo(() => Array.isArray(ownersData) ? ownersData : (ownersData?.data ?? []), [ownersData]);

  // Calculate enhanced owner data with metrics
  const ownersWithMetrics = useMemo(() => {
    return owners.map((owner) => {
      const totalBookings = owner.totalBookings ?? 0;
      const lifetimeValue = owner.lifetimeValue ?? 0;
      const lastBooking = owner.lastBooking || null;
      // Pet names array from backend; we keep existing shape used by table
      const pets = owner.pets || (owner.petNames ? owner.petNames.map((name) => ({ name })) : []);
      const nameFromParts = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
      const fullName = nameFromParts || owner.name || owner.fullName || owner.email || 'Owner';

      return {
        ...owner,
        fullName,
        totalBookings,
        lifetimeValue,
        lastBooking,
        pets,
      };
    });
  }, [owners]);

  // Filter owners based on search and status
  const filteredOwners = useMemo(() => {
    return ownersWithMetrics.filter(owner => {
      const matchesSearch = !searchTerm ||
        owner.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm) ||
        owner.pets?.some(pet =>
          pet.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const hasBookings = owner.totalBookings > 0;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && hasBookings) ||
        (statusFilter === 'INACTIVE' && !hasBookings);

      return matchesSearch && matchesStatus;
    });
  }, [ownersWithMetrics, searchTerm, statusFilter]);

  // Calculate stats
  const stats = {
    total: owners.length,
    active: ownersWithMetrics.filter(o => o.totalBookings > 0).length,
    inactive: ownersWithMetrics.filter(o => o.totalBookings === 0).length,
    highValue: ownersWithMetrics.filter(o => o.lifetimeValue >= 100000).length, // 1000 dollars in cents
    totalRevenue: ownersWithMetrics.reduce((sum, o) => sum + o.lifetimeValue, 0)
  };

  if (error) {
    return (
      <div>
        <PageHeader title="Owners" breadcrumb="Home > Clients > Owners" />
        <Card>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Error Loading Owners</h3>
            <p className="text-gray-600 dark:text-text-secondary">Unable to load owner data. Please try again.</p>
          </div>
        </Card>
      </div>
    );
  }

  const OwnerRow = ({ owner }) => {
    return (
      <tr className="border-b border-[#F5F6FA] hover:bg-gray-100 dark:bg-gray-700/50 cursor-pointer" onClick={() => navigate(`/customers/${owner.recordId}`)}>
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center text-white font-semibold">
              {owner.fullName?.[0]?.toUpperCase() || 'O'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-text-primary">{owner.fullName || 'Unnamed Owner'}</p>
              <p className="text-sm text-gray-600 dark:text-text-secondary">{owner.email || 'No email'}</p>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          {owner.phone && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-text-secondary">
              <Phone className="h-4 w-4" />
              <span>{owner.phone}</span>
            </div>
          )}
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-wrap gap-1">
            {owner.pets?.slice(0, 3).map((pet, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {pet.name}
              </Badge>
            ))}
            {owner.pets?.length > 3 && (
              <Badge variant="neutral" className="text-xs">
                +{owner.pets.length - 3} more
              </Badge>
            )}
          </div>
        </td>
        <td className="py-4 px-4">
          <Badge variant={owner.totalBookings > 0 ? 'success' : 'neutral'}>
            {owner.totalBookings > 0 ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td className="py-4 px-4">
          <p className="font-semibold text-gray-900 dark:text-text-primary">{owner.totalBookings}</p>
          {owner.lastBooking && (
            <p className="text-xs text-gray-600 dark:text-text-secondary">
              Last: {new Date(owner.lastBooking).toLocaleDateString()}
            </p>
          )}
        </td>
        <td className="py-4 px-4">
          <p className="font-semibold text-gray-900 dark:text-text-primary">{formatCurrency(owner.lifetimeValue)}</p>
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Clients > Owners"
        title="Pet Owners"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
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
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Owners</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Active Clients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">High Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.highValue}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-text-secondary" />
              <input
                type="text"
                placeholder="Search owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Clients</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-text-secondary">
            Showing {filteredOwners.length} of {owners.length} owners
          </div>
        </div>
      </Card>

      {/* Owners Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 dark:text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">No Owners Found</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first pet owner.'}
            </p>
            <Button onClick={() => setFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 dark:border-surface-border">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Owner</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Contact</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Pets</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Bookings</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-text-primary">Lifetime Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredOwners.map((owner) => (
                  <OwnerRow key={owner.recordId} owner={owner} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OwnerFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await createOwnerMutation.mutateAsync(data);
            setFormModalOpen(false);
          } catch (error) {
            console.error('Failed to create owner:', error);
            // Error handling will be shown in the form
          }
        }}
        isLoading={createOwnerMutation.isPending}
      />
    </div>
  );
};

export default Owners;