import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Phone, DollarSign, Calendar, Plus, Search, Filter, Mail, Heart } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnersQuery, useCreateOwnerMutation } from '../api';
import OwnerFormModal from '../components/OwnerFormModal';
import { formatCurrency } from '@/lib/utils';
import DirectoryListHeader from '@/features/directory/components/DirectoryListHeader';
import DirectoryEmptyState from '@/features/directory/components/DirectoryEmptyState';
import DirectoryErrorState from '@/features/directory/components/DirectoryErrorState';
import { DirectoryTableSkeleton } from '@/features/directory/components/DirectorySkeleton';
import OwnersListTable from '@/features/directory/components/OwnersListTable';

// TODO (C1:4 - Directory Query Consolidation): Convert to unified DirectorySnapshot hook.
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
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <DirectoryListHeader title="Pet Owners" description="Manage customer relationships" />
        <DirectoryErrorState message="Unable to load owner data. Please try again." />
      </div>
    );
  }

  const OwnerRow = ({ owner }) => {
    return (
      <tr
        className="cursor-pointer transition-colors"
        style={{
          borderBottomWidth: '1px',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
        onClick={() => navigate(`/customers/${owner.recordId}`)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bb-color-bg-elevated)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
          <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-[var(--bb-font-weight-semibold,600)]"
              style={{
                backgroundColor: 'var(--bb-color-accent)',
                color: 'var(--bb-color-text-on-accent)',
              }}
            >
              {owner.fullName?.[0]?.toUpperCase() || 'O'}
            </div>
            <div>
              <p className="font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
                {owner.fullName || 'Unnamed Owner'}
              </p>
              <p className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
                {owner.email || 'No email'}
              </p>
            </div>
          </div>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
          {owner.phone && (
            <div className="flex items-center gap-[var(--bb-space-2,0.5rem)] text-[color:var(--bb-color-text-muted)]">
              <Phone className="h-4 w-4" />
              <span className="text-[var(--bb-font-size-sm,0.875rem)]">{owner.phone}</span>
            </div>
          )}
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
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
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
          <Badge variant={owner.totalBookings > 0 ? 'success' : 'neutral'}>
            {owner.totalBookings > 0 ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
          <p className="font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
            {owner.totalBookings}
          </p>
          {owner.lastBooking && (
            <p className="text-[var(--bb-font-size-xs,0.75rem)] text-[color:var(--bb-color-text-muted)]">
              Last: {new Date(owner.lastBooking).toLocaleDateString()}
            </p>
          )}
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-4,1rem)]">
          <p className="font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
            {formatCurrency(owner.lifetimeValue)}
          </p>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <DirectoryListHeader
        title="Pet Owners"
        description="Manage customer relationships"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="primary" size="sm" onClick={() => setFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          </>
        }
      >
        {/* Stats Grid */}
        <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          ) : (
            <>
              <Card>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                  >
                    <Users className="h-5 w-5" style={{ color: 'var(--bb-color-accent)' }} />
                  </div>
                  <div>
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                      Total Owners
                    </p>
                    <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <Heart className="h-5 w-5" style={{ color: 'var(--bb-color-status-positive)' }} />
                  </div>
                  <div>
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                      Active Clients
                    </p>
                    <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                      {stats.active}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                  >
                    <DollarSign className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                      High Value
                    </p>
                    <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                      {stats.highValue}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}
                  >
                    <Calendar className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                      Total Revenue
                    </p>
                    <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Filters Card */}
        <Card>
          <div className="flex flex-col gap-[var(--bb-space-4,1rem)]">
            <div className="flex flex-col gap-[var(--bb-space-3,0.75rem)] sm:flex-row">
              <div className="relative flex-1 sm:max-w-md">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search owners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border py-[var(--bb-space-2,0.5rem)] pl-10 pr-4 text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2 sm:w-auto"
                style={{
                  backgroundColor: 'var(--bb-color-bg-elevated)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Clients</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
              Showing {filteredOwners.length} of {owners.length} owners
            </div>
          </div>
        </Card>
      </DirectoryListHeader>

      {isLoading ? (
        <DirectoryTableSkeleton />
      ) : filteredOwners.length === 0 ? (
        <DirectoryEmptyState
          title="No Owners Found"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Get started by adding your first pet owner.'
          }
          icon={Users}
        >
          <Button onClick={() => setFormModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Owner
          </Button>
        </DirectoryEmptyState>
      ) : (
        <OwnersListTable
          owners={filteredOwners}
          renderRow={(owner) => <OwnerRow key={owner.recordId} owner={owner} />}
        />
      )}
      </div>

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
    </>
  );
};

export default Owners;