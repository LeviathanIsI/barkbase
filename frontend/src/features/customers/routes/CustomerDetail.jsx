/**
 * Customer Detail Page - 3-Column Enterprise Layout
 * Left: Property cards (About, Address, Emergency, Notes)
 * Middle: Stats + Tabs (Overview, Activity, Bookings, Billing)
 * Right: Associations (Pets, Bookings, Invoices, Segments)
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerParams } from '@/lib/useRecordParams';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  PawPrint,
  MessageSquare,
  FileText,
  Plus,
  MoreHorizontal,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Activity,
  CreditCard,
  Send,
  Star,
  Shield,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Tag,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, startOfToday } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { Card, MetricCard } from '@/components/ui/Card';
import { PropertyCard, PropertyList } from '@/components/ui/PropertyCard';
import { AssociationCard, AssociationItem } from '@/components/ui/AssociationCard';
import { EditablePropertyList, EditablePropertyProvider } from '@/components/ui/EditableProperty';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwner, useDeleteOwnerMutation, useUpdateOwnerMutation } from '@/features/owners/api';
import { usePetsQuery } from '@/features/pets/api';
import { useBookingsQuery } from '@/features/bookings/api';
import { useCommunicationStats, useCustomerTimeline } from '@/features/communications/api';
import CommunicationForm from '@/features/communications/components/CommunicationForm';
import NotesPanel from '@/features/communications/components/NotesPanel';
import ActivityTimeline from '@/features/activities/components/ActivityTimeline';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Never';
  }
};

const getStatusVariant = (status) => {
  const statusMap = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'neutral',
    CANCELLED: 'danger',
    COMPLETED: 'success',
  };
  return statusMap[status?.toUpperCase()] || 'neutral';
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CustomerDetail() {
  // Extract ownerId from either old (/customers/:ownerId) or new (/customers/:accountCode/record/:typeCode/:recordId) URL pattern
  const { id: ownerId } = useCustomerParams();
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCommunicationForm, setShowCommunicationForm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const moreMenuRef = useRef(null);

  // Data fetching
  const { data: owner, isLoading: ownerLoading, refetch: refetchOwner } = useOwner(ownerId);
  const { data: petsData } = usePetsQuery({ ownerId });
  const ownerPets = petsData?.pets || [];
  const { data: stats } = useCommunicationStats(ownerId);
  const { data: allBookings } = useBookingsQuery({ ownerId });

  // Mutations
  const deleteMutation = useDeleteOwnerMutation();
  const updateMutation = useUpdateOwnerMutation(ownerId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle edit owner
  const handleEditOwner = () => {
    openSlideout(SLIDEOUT_TYPES.OWNER_EDIT, {
      owner,
      onSuccess: () => refetchOwner(),
    });
  };

  // Handle new booking
  const handleNewBooking = () => {
    openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId });
  };

  // Handle send message
  const handleSendMessage = () => {
    openSlideout(SLIDEOUT_TYPES.COMMUNICATION_CREATE, { ownerId });
    setShowMoreMenu(false);
  };

  // Handle toggle active status
  const handleToggleStatus = async () => {
    const newStatus = owner?.status === 'active' ? 'inactive' : 'active';
    try {
      await updateMutation.mutateAsync({ status: newStatus });
      toast.success(`Customer ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      refetchOwner();
    } catch (error) {
      toast.error('Failed to update status');
    }
    setShowMoreMenu(false);
  };

  // Handle delete owner
  const handleDeleteOwner = async () => {
    try {
      await deleteMutation.mutateAsync(ownerId);
      toast.success('Customer deleted');
      navigate('/owners');
    } catch (error) {
      toast.error('Failed to delete customer');
    }
    setShowDeleteConfirm(false);
  };

  // Handle inline property edits
  const handlePropertySave = async (fieldKey, value) => {
    try {
      // Handle nested address fields
      if (fieldKey.startsWith('address.')) {
        const addressKey = fieldKey.split('.')[1];
        await updateMutation.mutateAsync({
          address: { ...(owner.address || {}), [addressKey]: value }
        });
      } else {
        await updateMutation.mutateAsync({ [fieldKey]: value });
      }
      toast.success('Updated successfully');
      refetchOwner();
    } catch (err) {
      toast.error('Failed to update');
      throw err;
    }
  };

  // Derived data
  const ownerBookings = useMemo(() => {
    if (!allBookings || !ownerId) return [];
    const bookingsArray = Array.isArray(allBookings) ? allBookings : (allBookings?.data ?? []);
    return bookingsArray.filter(b => b.ownerId === ownerId);
  }, [allBookings, ownerId]);

  const { upcomingBookings, recentBookings, lifetimeValue, activePets } = useMemo(() => {
    const today = startOfToday();
    const upcoming = ownerBookings
      .filter(b => isAfter(new Date(b.checkIn), today) && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
      .slice(0, 3);
    const recent = ownerBookings
      .filter(b => isBefore(new Date(b.checkIn), today) || b.status === 'CHECKED_OUT')
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))
      .slice(0, 3);
    const value = ownerBookings.reduce((sum, b) => sum + (b.totalPriceInCents || 0), 0);
    const pets = owner?.pets?.filter(p => p.status === 'active' || !p.status) || [];
    return { upcomingBookings: upcoming, recentBookings: recent, lifetimeValue: value, activePets: pets };
  }, [ownerBookings, owner]);

  // Loading state
  if (ownerLoading) {
    return (
      <div className="flex h-full">
        <aside className="w-64 border-r p-4 space-y-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </aside>
        <main className="flex-1 p-6">
          <Skeleton className="h-12 w-64 mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-96" />
        </main>
        <aside className="w-72 border-l p-4 space-y-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </aside>
      </div>
    );
  }

  // Not found state
  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <User className="w-16 h-16 mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Customer not found
        </h2>
        <p className="mt-2 mb-6" style={{ color: 'var(--bb-color-text-muted)' }}>
          The customer you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/owners')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Customer';
  // Priority: dedicated owner-pets query > owner.pets embedded data
  const petsFromQuery = Array.isArray(ownerPets) ? ownerPets.filter(p => p && (p.recordId || p.id)) : [];
  const petsFromOwner = owner.pets?.filter(p => p && (p.recordId || p.id)) || [];
  const pets = petsFromQuery.length > 0 ? petsFromQuery : petsFromOwner;
  const totalBookings = ownerBookings.length;
  const lastActivity = owner.updatedAt || owner.createdAt;
  const invoices = owner.invoices || [];
  const segments = owner.segments || [];

  // Customer status
  const customerStatus = totalBookings > 10 ? 'VIP' : totalBookings > 0 ? 'Active' : 'New';
  const customerStatusVariant = totalBookings > 10 ? 'accent' : totalBookings > 0 ? 'success' : 'neutral';

  // Address parts
  const hasAddress = owner.address?.street || owner.address?.city || owner.city;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
          <Link
            to="/owners"
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
              <h1
                className="text-2xl font-semibold truncate"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                {fullName}
              </h1>
              <Badge variant={customerStatusVariant}>
                {customerStatus}
              </Badge>
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              {owner.email || 'No email on file'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={handleEditOwner}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Owner
            </Button>
            <Button variant="primary" onClick={handleNewBooking}>
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>

            {/* More Actions Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
              {showMoreMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 py-1"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    borderColor: 'var(--bb-color-border-subtle)',
                  }}
                >
                  <button
                    onClick={handleSendMessage}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
                  <button
                    onClick={() => { setActiveTab('billing'); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    <CreditCard className="w-4 h-4" />
                    View Billing
                  </button>
                  <div className="border-t my-1" style={{ borderColor: 'var(--bb-color-border-subtle)' }} />
                  <button
                    onClick={handleToggleStatus}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
                    style={{ color: owner?.status === 'active' ? 'var(--bb-color-status-caution)' : 'var(--bb-color-status-positive)' }}
                  >
                    {owner?.status === 'active' ? (
                      <>
                        <UserX className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
                    style={{ color: 'var(--bb-color-status-negative)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Customer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Property Cards (420px fixed) */}
        <EditablePropertyProvider>
        <aside
          className="w-[420px] min-w-[420px] flex-shrink-0 border-r overflow-y-auto p-4 space-y-4"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          {/* About this Customer */}
          <PropertyCard title="About this Customer" icon={User} storageKey={`customer_${ownerId}_about`}>
            <EditablePropertyList
              properties={[
                { label: 'First Name', value: owner.firstName, fieldKey: 'firstName', type: 'text' },
                { label: 'Last Name', value: owner.lastName, fieldKey: 'lastName', type: 'text' },
                { label: 'Email', value: owner.email, fieldKey: 'email', type: 'email' },
                { label: 'Phone', value: owner.phone, fieldKey: 'phone', type: 'phone' },
              ]}
              onSave={handlePropertySave}
            />
            {/* Status and Customer Since are read-only */}
            <div className="mt-4 space-y-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>Status</dt>
                <dd><Badge variant={customerStatusVariant}>{customerStatus}</Badge></dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>Customer Since</dt>
                <dd className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>{safeFormatDate(owner.createdAt) || '—'}</dd>
              </div>
            </div>
          </PropertyCard>

          {/* Address */}
          <PropertyCard
            title="Address"
            icon={MapPin}
            storageKey={`customer_${ownerId}_address`}
            defaultOpen={!!hasAddress}
          >
            <EditablePropertyList
              properties={[
                { label: 'Street', value: owner.address?.street, fieldKey: 'address.street', type: 'text' },
                { label: 'City', value: owner.address?.city || owner.city, fieldKey: 'address.city', type: 'text' },
                { label: 'State', value: owner.address?.state, fieldKey: 'address.state', type: 'text' },
                { label: 'ZIP Code', value: owner.address?.zip, fieldKey: 'address.zip', type: 'text' },
                { label: 'Country', value: owner.address?.country, fieldKey: 'address.country', type: 'text' },
              ]}
              onSave={handlePropertySave}
            />
          </PropertyCard>

          {/* Emergency Contact */}
          <PropertyCard
            title="Emergency Contact"
            icon={AlertCircle}
            storageKey={`customer_${ownerId}_emergency`}
            defaultOpen={!!(owner.emergencyContactName || owner.emergencyContactPhone)}
          >
            <EditablePropertyList
              properties={[
                { label: 'Contact Name', value: owner.emergencyContactName, fieldKey: 'emergencyContactName', type: 'text' },
                { label: 'Contact Phone', value: owner.emergencyContactPhone, fieldKey: 'emergencyContactPhone', type: 'phone' },
              ]}
              onSave={handlePropertySave}
            />
          </PropertyCard>

          {/* Notes */}
          <PropertyCard
            title="Notes"
            icon={MessageSquare}
            storageKey={`customer_${ownerId}_notes`}
            defaultOpen={!!owner.notes}
          >
            <EditablePropertyList
              properties={[
                { label: 'Notes', value: owner.notes, fieldKey: 'notes', type: 'textarea' },
              ]}
              onSave={handlePropertySave}
            />
          </PropertyCard>

          {/* Account - Read-only computed fields */}
          <PropertyCard title="Account" icon={CreditCard} storageKey={`customer_${ownerId}_account`}>
            <PropertyList
              properties={[
                { label: 'Lifetime Value', value: lifetimeValue, type: 'currency' },
                { label: 'Total Bookings', value: totalBookings },
                { label: 'Payment on File', value: owner.hasPaymentMethod ? 'Yes' : 'No' },
              ]}
            />
          </PropertyCard>
        </aside>
        </EditablePropertyProvider>

        {/* MIDDLE COLUMN - Stats + Tabs (flex-1) */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* Stats Bar */}
          <div className="px-6 py-4 border-b grid grid-cols-4 gap-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <StatItem label="Total Bookings" value={totalBookings} />
            <StatItem label="Lifetime Value" value={formatCurrency(lifetimeValue)} />
            <StatItem label="Active Pets" value={pets.length} />
            <StatItem label="Last Activity" value={safeFormatDistance(lastActivity)} />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-6" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Activity
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
                <OverviewTab
                  ownerId={ownerId}
                  owner={owner}
                  pets={pets}
                  upcomingBookings={upcomingBookings}
                  recentBookings={recentBookings}
                  stats={stats}
                  onTabChange={setActiveTab}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <ActivityTab ownerId={ownerId} ownerEmail={owner.email} ownerPhone={owner.phone} />
              </TabsContent>

              <TabsContent value="bookings" className="mt-0">
                <BookingsTab
                  bookings={ownerBookings}
                  ownerName={fullName}
                  ownerId={ownerId}
                />
              </TabsContent>

              <TabsContent value="billing" className="mt-0">
                <BillingTab
                  ownerId={ownerId}
                  bookings={ownerBookings}
                  lifetimeValue={lifetimeValue}
                />
              </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* RIGHT SIDEBAR - Associations (460px fixed) */}
        <aside
          className="w-[460px] min-w-[460px] flex-shrink-0 border-l overflow-y-auto p-4 space-y-4"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          {/* Pets */}
          <AssociationCard
            title="Pets"
            type="pet"
            count={pets.length}
            onAdd={() => navigate(`/pets?action=new&ownerId=${ownerId}`)}
            viewAllLink={pets.length > 5 ? `/pets?ownerId=${ownerId}` : undefined}
            emptyMessage="No pets yet"
          >
            {pets.slice(0, 5).map((pet) => (
              <AssociationItem
                key={pet.recordId || pet.id}
                name={pet.name}
                subtitle={pet.breed || pet.species || 'Pet'}
                href={`/pets/${pet.recordId || pet.id}`}
                type="pet"
              />
            ))}
          </AssociationCard>

          {/* Bookings */}
          <AssociationCard
            title="Bookings"
            type="booking"
            count={ownerBookings.length}
            onAdd={handleNewBooking}
            viewAllLink={ownerBookings.length > 5 ? `/bookings?ownerId=${ownerId}` : undefined}
            emptyMessage="No bookings yet"
          >
            {ownerBookings.slice(0, 5).map((booking) => (
              <AssociationItem
                key={booking.recordId || booking.id}
                name={`${safeFormatDate(booking.checkIn, 'MMM d')} - ${safeFormatDate(booking.checkOut, 'MMM d')}`}
                subtitle={booking.petName || 'Booking'}
                href={`/bookings/${booking.recordId || booking.id}`}
                type="booking"
                status={booking.status?.replace(/_/g, ' ')}
                statusVariant={getStatusVariant(booking.status)}
              />
            ))}
          </AssociationCard>

          {/* Invoices */}
          <AssociationCard
            title="Invoices"
            type="invoice"
            count={invoices.length}
            onAdd={() => navigate(`/invoices?action=new&ownerId=${ownerId}`)}
            viewAllLink={invoices.length > 3 ? `/invoices?ownerId=${ownerId}` : undefined}
            emptyMessage="No invoices yet"
          >
            {invoices.slice(0, 3).map((invoice) => (
              <AssociationItem
                key={invoice.recordId || invoice.id}
                name={`#${invoice.invoiceNumber || invoice.recordId?.slice(0, 8)}`}
                subtitle={formatCurrency(invoice.totalCents || 0)}
                href={`/invoices/${invoice.recordId || invoice.id}`}
                type="invoice"
                status={invoice.status}
                statusVariant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}
              />
            ))}
          </AssociationCard>

          {/* Segments */}
          <AssociationCard
            title="Segments"
            type="segment"
            count={segments.length}
            showAdd={false}
            emptyMessage="No segments"
          >
            {segments.map((segment, idx) => (
              <AssociationItem
                key={segment.id || segment.recordId || idx}
                name={segment.name || segment}
                type="segment"
                href={segment.id ? `/segments/${segment.id}` : undefined}
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
                onClick={handleNewBooking}
              >
                <Calendar className="w-4 h-4 mr-2" />
                New Booking
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate(`/pets?action=new&ownerId=${ownerId}`)}
              >
                <PawPrint className="w-4 h-4 mr-2" />
                Add Pet
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Customer"
        description={`Are you sure you want to delete ${fullName}? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteOwner}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// STAT ITEM COMPONENT
// ============================================================================

function StatItem({ label, value }) {
  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-wide mb-0.5"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-lg font-semibold"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ ownerId, owner, pets, upcomingBookings, recentBookings, stats, onTabChange }) {
  const { openSlideout } = useSlideout();
  const { data: timelineData, isLoading: timelineLoading } = useCustomerTimeline(ownerId);
  const timeline = timelineData?.pages?.flatMap(page => page?.data || []) || [];

  return (
    <div className="space-y-8">
      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Recent Activity
          </h3>
          <Button variant="outline" size="sm" onClick={() => onTabChange('activity')}>
            View All
          </Button>
        </div>

        {timelineLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div
            className="text-center py-8 rounded-lg border-2 border-dashed"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <Activity className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              No activity yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.slice(0, 5).map((item, index) => (
              <ActivityItem key={item.recordId || index} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
              Customer Since
            </p>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(owner.createdAt) || 'Unknown'}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
              Last Updated
            </p>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(owner.updatedAt) || 'Unknown'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityItem({ item }) {
  const Icon = item.type === 'booking' ? Calendar
    : item.type === 'payment' ? DollarSign
    : item.type === 'communication' ? MessageSquare
    : FileText;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          {item.title || item.content || 'Activity'}
        </p>
        {item.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--bb-color-text-muted)' }}>
            {item.description}
          </p>
        )}
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }}>
        {safeFormatDistance(item.timestamp || item.createdAt)}
      </span>
    </div>
  );
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

function ActivityTab({ ownerId, ownerEmail, ownerPhone }) {
  return (
    <ActivityTimeline
      entityType="owner"
      entityId={ownerId}
      defaultEmail={ownerEmail}
      defaultPhone={ownerPhone}
    />
  );
}

// ============================================================================
// BOOKINGS TAB
// ============================================================================

function BookingsTab({ bookings, ownerName, ownerId }) {
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();
  const [filter, setFilter] = useState('all');

  const filteredBookings = useMemo(() => {
    const today = startOfToday();
    switch (filter) {
      case 'upcoming':
        return bookings.filter(b => isAfter(new Date(b.checkIn), today) && b.status !== 'CANCELLED');
      case 'past':
        return bookings.filter(b => isBefore(new Date(b.checkOut), today) || b.status === 'CHECKED_OUT');
      case 'cancelled':
        return bookings.filter(b => b.status === 'CANCELLED');
      default:
        return bookings;
    }
  }, [bookings, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          All Bookings ({bookings.length})
        </h3>
        <div className="flex items-center gap-2">
          <div className="min-w-[130px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={filter}
              onChange={(opt) => setFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <div
              key={booking.recordId || booking.id}
              onClick={() => navigate(`/bookings/${booking.recordId || booking.id}`)}
              className="flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {booking.petName || 'Pet'} {booking.totalPriceInCents ? `• ${formatCurrency(booking.totalPriceInCents)}` : ''}
                </p>
              </div>
              <Badge variant={getStatusVariant(booking.status)}>
                {booking.status?.replace(/_/g, ' ') || 'Pending'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BILLING TAB
// ============================================================================

function BillingTab({ ownerId, bookings, lifetimeValue }) {
  const totalPaid = bookings
    .filter(b => b.status === 'CHECKED_OUT' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.totalPriceInCents || 0), 0);

  const outstanding = lifetimeValue - totalPaid;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
              Lifetime Value
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--bb-color-text-primary)' }}>
              {formatCurrency(lifetimeValue)}
            </p>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
              Total Paid
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--bb-color-status-positive)' }}>
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
              Outstanding
            </p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: outstanding > 0 ? 'var(--bb-color-status-caution)' : 'var(--bb-color-text-primary)' }}
            >
              {formatCurrency(outstanding)}
            </p>
          </div>
        </div>
      </section>

      {/* Invoice History */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Invoice History
        </h3>
        <div
          className="text-center py-8 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <CreditCard className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            Invoice history coming soon
          </p>
        </div>
      </section>
    </div>
  );
}
