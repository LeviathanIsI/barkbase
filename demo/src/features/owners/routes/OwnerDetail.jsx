/**
 * Owner Detail Page - Demo Version
 * 3-Column Enterprise Layout with mock data.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
  Users as UsersIcon,
  Mail,
  Edit,
  Trash2,
  Calendar,
  Phone,
  PawPrint,
  DollarSign,
  Plus,
  Eye,
  ChevronRight,
  ArrowLeft,
  MapPin,
  AlertCircle,
  Clock,
  CreditCard,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PropertyCard, PropertyList } from '@/components/ui/PropertyCard';
import { AssociationCard, AssociationItem } from '@/components/ui/AssociationCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useOwnerQuery, useDeleteOwnerMutation } from '../api';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn, formatCurrency } from '@/lib/utils';
import petsData from '@/data/pets.json';
import bookingsData from '@/data/bookings.json';

// Helper to safely format dates
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return format(date, formatStr);
  } catch {
    return null;
  }
};

const safeFormatDistance = (dateStr) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
};

const OwnerDetail = () => {
  const { ownerId } = useParams();
  const navigate = useNavigate();

  const [deleteOwnerDialogOpen, setDeleteOwnerDialogOpen] = useState(false);
  const [isDeletingOwner, setIsDeletingOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const ownerQuery = useOwnerQuery(ownerId);
  const deleteOwnerMutation = useDeleteOwnerMutation();

  const owner = ownerQuery.data;

  // Get pets for this owner from mock data
  const pets = useMemo(() => {
    if (!owner) return [];
    return petsData.filter(
      (pet) => pet.ownerId === owner.id || pet.ownerId === parseInt(owner.id, 10)
    );
  }, [owner]);

  // Get bookings for this owner from mock data
  const bookings = useMemo(() => {
    if (!owner) return [];
    return bookingsData.filter(
      (booking) => booking.ownerId === owner.id || booking.ownerId === parseInt(owner.id, 10)
    );
  }, [owner]);

  const handleEdit = () => {
    toast('Edit functionality coming soon!', { icon: '📝' });
  };

  const handleDelete = () => {
    setDeleteOwnerDialogOpen(true);
  };

  const handleConfirmOwnerDelete = async () => {
    setIsDeletingOwner(true);
    try {
      await deleteOwnerMutation.mutateAsync({ ownerId });
      toast.success('Owner deleted successfully');
      navigate('/customers');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete owner');
    } finally {
      setIsDeletingOwner(false);
      setDeleteOwnerDialogOpen(false);
    }
  };

  // Loading state
  if (ownerQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-pulse" style={{ color: 'var(--bb-color-text-muted)' }}>
          Loading owner details...
        </div>
      </div>
    );
  }

  // Not found state
  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <UsersIcon className="w-16 h-16 mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Owner not found
        </h2>
        <p className="mt-2" style={{ color: 'var(--bb-color-text-muted)' }}>
          This owner may have been deleted or doesn't exist.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/customers')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Owners
        </Button>
      </div>
    );
  }

  const fullName = owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner';
  const lifetimeValue = owner.totalSpent || 0;

  // Status badge
  const ownerStatus = owner.status === 'active' ? 'Active Client' : 'Inactive';
  const ownerStatusVariant = owner.status === 'active' ? 'success' : 'neutral';

  // Build address parts
  const hasAddress = owner.address || owner.city || owner.state;

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
            <Link
              to="/customers"
              className="flex items-center gap-1 hover:text-[color:var(--bb-color-text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Customers
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span style={{ color: 'var(--bb-color-text-primary)' }}>{fullName}</span>
          </nav>

          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {fullName}
                </h1>
                <Badge variant={ownerStatusVariant}>{ownerStatus}</Badge>
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {owner.email || 'No email on file'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="primary" onClick={() => navigate('/bookings')}>
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
              <Button variant="secondary" onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Property Cards */}
          <aside
            className="w-64 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* About this Owner */}
            <PropertyCard title="About" icon={UsersIcon} storageKey={`owner_${ownerId}_about`}>
              <PropertyList
                properties={[
                  { label: 'First Name', value: owner.firstName },
                  { label: 'Last Name', value: owner.lastName },
                  { label: 'Email', value: owner.email },
                  { label: 'Phone', value: owner.phone },
                ]}
              />
              <div className="mt-4 space-y-3">
                <div>
                  <dt
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    Status
                  </dt>
                  <dd>
                    <Badge variant={ownerStatusVariant}>{ownerStatus}</Badge>
                  </dd>
                </div>
                <div>
                  <dt
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    Created
                  </dt>
                  <dd className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {safeFormatDate(owner.createdAt) || '-'}
                  </dd>
                </div>
              </div>
            </PropertyCard>

            {/* Address */}
            <PropertyCard title="Address" icon={MapPin} storageKey={`owner_${ownerId}_address`} defaultOpen={hasAddress}>
              <PropertyList
                properties={[
                  { label: 'Street', value: owner.address },
                  { label: 'City', value: owner.city },
                  { label: 'State', value: owner.state },
                  { label: 'ZIP Code', value: owner.zip },
                ]}
              />
            </PropertyCard>

            {/* Emergency Contact */}
            <PropertyCard
              title="Emergency Contact"
              icon={AlertCircle}
              storageKey={`owner_${ownerId}_emergency`}
              defaultOpen={!!(owner.emergencyContact || owner.emergencyPhone)}
            >
              <PropertyList
                properties={[
                  { label: 'Contact Name', value: owner.emergencyContact },
                  { label: 'Contact Phone', value: owner.emergencyPhone },
                ]}
              />
            </PropertyCard>

            {/* Account */}
            <PropertyCard title="Account" icon={CreditCard} storageKey={`owner_${ownerId}_account`}>
              <PropertyList
                properties={[
                  { label: 'Lifetime Value', value: lifetimeValue, type: 'currency' },
                  { label: 'Total Visits', value: owner.visitCount || 0 },
                ]}
              />
            </PropertyCard>

            {/* Notes */}
            {owner.notes && (
              <PropertyCard title="Notes" icon={MessageSquare} storageKey={`owner_${ownerId}_notes`}>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {owner.notes}
                </p>
              </PropertyCard>
            )}
          </aside>

          {/* Middle - Stats + Tabs */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats Bar */}
            <div
              className="px-6 py-4 border-b grid grid-cols-4 gap-4"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <StatItem label="Total Bookings" value={bookings.length} />
              <StatItem label="Lifetime Value" value={formatCurrency(lifetimeValue)} />
              <StatItem label="Active Pets" value={pets.length} />
              <StatItem label="Total Visits" value={owner.visitCount || 0} />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="border-b px-6" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Billing
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab owner={owner} bookings={bookings} pets={pets} lifetimeValue={lifetimeValue} />
                </TabsContent>

                <TabsContent value="bookings" className="mt-0">
                  <BookingsTab bookings={bookings} />
                </TabsContent>

                <TabsContent value="billing" className="mt-0">
                  <BillingTab owner={owner} />
                </TabsContent>
              </div>
            </Tabs>
          </main>

          {/* Right Sidebar - Associations */}
          <aside
            className="w-72 flex-shrink-0 border-l overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* Pets */}
            <AssociationCard
              title="Pets"
              type="pet"
              count={pets.length}
              onAdd={() => toast('Add pet feature coming soon!', { icon: '🐕' })}
              emptyMessage="No pets yet"
            >
              {pets.slice(0, 5).map((pet) => (
                <AssociationItem
                  key={pet.id}
                  name={pet.name}
                  subtitle={pet.breed || pet.species || 'Pet'}
                  href={`/pets/${pet.id}`}
                  type="pet"
                />
              ))}
            </AssociationCard>

            {/* Bookings */}
            <AssociationCard
              title="Bookings"
              type="booking"
              count={bookings.length}
              onAdd={() => navigate('/bookings')}
              emptyMessage="No bookings yet"
            >
              {bookings.slice(0, 5).map((booking) => (
                <AssociationItem
                  key={booking.id}
                  name={`${safeFormatDate(booking.checkIn, 'MMM d')} - ${safeFormatDate(booking.checkOut, 'MMM d')}`}
                  subtitle={booking.petName || 'Booking'}
                  href={`/bookings/${booking.id}`}
                  type="booking"
                  status={booking.status}
                  statusVariant={getStatusVariant(booking.status)}
                />
              ))}
            </AssociationCard>

            {/* Quick Actions */}
            <Card className="p-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Quick Actions
              </h3>
              <div className="space-y-2">
                {owner.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${owner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
                {owner.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${owner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate('/bookings')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOwnerDialogOpen}
        onOpenChange={setDeleteOwnerDialogOpen}
        title="Delete Owner"
        description={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={isDeletingOwner}
        onConfirm={handleConfirmOwnerDelete}
      />
    </>
  );
};

// Stat Item Component
const StatItem = ({ label, value }) => (
  <div className="text-center">
    <p className="text-2xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
      {value}
    </p>
    <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
      {label}
    </p>
  </div>
);

// Get status variant helper
const getStatusVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'danger';
    case 'checked_in':
      return 'info';
    default:
      return 'neutral';
  }
};

// Overview Tab Component
const OverviewTab = ({ owner, bookings, pets, lifetimeValue }) => {
  const recentBookings = bookings.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Customer Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Total Visits
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {owner.visitCount || 0}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Total Spent
            </p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(lifetimeValue)}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Active Pets
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {pets.length}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Member Since
            </p>
            <p className="text-xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(owner.createdAt, 'MMM yyyy') || '-'}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Bookings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Recent Bookings
        </h3>
        {recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
              >
                <div>
                  <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {booking.petName}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                  </p>
                </div>
                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No recent bookings
          </p>
        )}
      </Card>

      {/* Pets */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Pets
        </h3>
        {pets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                to={`/pets/${pet.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ backgroundColor: 'var(--bb-color-accent-soft)', color: 'var(--bb-color-accent)' }}
                >
                  <PawPrint className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {pet.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {pet.breed || pet.species}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No pets registered
          </p>
        )}
      </Card>
    </div>
  );
};

// Bookings Tab Component
const BookingsTab = ({ bookings }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          All Bookings
        </h3>
      </div>

      {bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                >
                  <Calendar className="h-6 w-6" style={{ color: 'var(--bb-color-accent)' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {booking.petName} - {booking.serviceName || 'Boarding'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                <span className="font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {formatCurrency(booking.totalCents || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-lg border"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Calendar className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            No bookings yet
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
            Create a new booking to get started
          </p>
        </div>
      )}
    </div>
  );
};

// Billing Tab Component
const BillingTab = ({ owner }) => {
  return (
    <div className="space-y-6">
      {/* Account Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Account Summary
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Total Spent
            </p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(owner.totalSpent || 0)}</p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Pending Balance
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {formatCurrency(0)}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Total Visits
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {owner.visitCount || 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Payment History
        </h3>
        <div
          className="text-center py-8 rounded-lg border"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <DollarSign className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            No payment history
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
            Payment records will appear here
          </p>
        </div>
      </Card>
    </div>
  );
};

export default OwnerDetail;
