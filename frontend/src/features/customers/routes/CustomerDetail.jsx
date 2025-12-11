/**
 * Customer Detail Page - Enterprise 360° View
 * Two-column layout with tabbed content and sticky owner summary panel
 * Designed for kennel operations staff to quickly access all customer data
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, startOfToday } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, MetricCard } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwner, useDeleteOwnerMutation, useUpdateOwnerMutation } from '@/features/owners/api';
import { useBookingsQuery } from '@/features/bookings/api';
import { useCommunicationStats, useCustomerTimeline } from '@/features/communications/api';
import CommunicationForm from '@/features/communications/components/CommunicationForm';
import NotesPanel from '@/features/communications/components/NotesPanel';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return format(date, formatStr);
  } catch {
    return '—';
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
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCommunicationForm, setShowCommunicationForm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const moreMenuRef = useRef(null);

  // Data fetching
  const { data: owner, isLoading: ownerLoading, refetch: refetchOwner } = useOwner(ownerId);
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

  // Handle log activity
  const handleLogActivity = () => {
    openSlideout(SLIDEOUT_TYPES.ACTIVITY_LOG, { ownerId });
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8"><Skeleton className="h-96" /></div>
          <div className="col-span-4"><Skeleton className="h-96" /></div>
        </div>
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
  const pets = owner.pets?.filter(p => p && p.recordId) || [];
  const totalBookings = ownerBookings.length;
  const lastActivity = owner.updatedAt || owner.createdAt;

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--bb-color-bg-base)' }}>
      {/* ================================================================== */}
      {/* HEADER SECTION */}
      {/* ================================================================== */}
      <header
        className="border-b sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            {/* Left: Back + Owner Info */}
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate('/owners')}
                className="flex items-center gap-2 text-sm font-medium transition-colors mt-1"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {fullName}
                </h1>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {owner.email && (
                    <a
                      href={`mailto:${owner.email}`}
                      className="flex items-center gap-1.5 hover:text-[color:var(--bb-color-accent)] transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {owner.email}
                    </a>
                  )}
                  {owner.phone && (
                    <a
                      href={`tel:${owner.phone}`}
                      className="flex items-center gap-1.5 hover:text-[color:var(--bb-color-accent)] transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {owner.phone}
                    </a>
                  )}
                  {(owner.address?.city || owner.city) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {owner.address?.city || owner.city}{owner.address?.state ? `, ${owner.address.state}` : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="neutral" size="sm">
                    <Calendar className="w-3 h-3" />
                    Customer since {safeFormatDate(owner.createdAt, 'MMM yyyy')}
                  </Badge>
                  {totalBookings > 10 && (
                    <Badge variant="accent" size="sm">
                      <Star className="w-3 h-3" />
                      Frequent
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="md" onClick={handleEditOwner}>
                <Edit className="w-4 h-4" />
                Edit Owner
              </Button>
              <Button size="md" onClick={handleNewBooking}>
                <Plus className="w-4 h-4" />
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
                      style={{ color: owner?.status === 'active' ? 'var(--bb-color-status-warning-text)' : 'var(--bb-color-status-positive-text)' }}
                    >
                      {owner?.status === 'active' ? (
                        <>
                          <UserX className="w-4 h-4" />
                          Deactivate Customer
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Activate Customer
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

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <MetricStrip
              icon={Calendar}
              label="Total Bookings"
              value={totalBookings}
            />
            <MetricStrip
              icon={DollarSign}
              label="Lifetime Value"
              value={formatCurrency(lifetimeValue)}
            />
            <MetricStrip
              icon={PawPrint}
              label="Active Pets"
              value={activePets.length}
            />
            <MetricStrip
              icon={Clock}
              label="Last Activity"
              value={safeFormatDistance(lastActivity)}
            />
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTENT - TWO COLUMN LAYOUT */}
      {/* ================================================================== */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT COLUMN - TABS & CONTENT */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">
                  <Activity className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="bookings">
                  <Calendar className="w-4 h-4 mr-2" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="pets">
                  <PawPrint className="w-4 h-4 mr-2" />
                  Pets
                </TabsTrigger>
                <TabsTrigger value="communications">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Communications
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview">
                <OverviewTab
                  ownerId={ownerId}
                  owner={owner}
                  pets={pets}
                  upcomingBookings={upcomingBookings}
                  recentBookings={recentBookings}
                  stats={stats}
                  onTabChange={setActiveTab}
                  onLogActivity={handleLogActivity}
                />
              </TabsContent>

              {/* BOOKINGS TAB */}
              <TabsContent value="bookings">
                <BookingsTab
                  bookings={ownerBookings}
                  ownerName={fullName}
                  ownerId={ownerId}
                />
              </TabsContent>

              {/* PETS TAB */}
              <TabsContent value="pets">
                <PetsTab
                  pets={pets}
                  ownerId={ownerId}
                  ownerName={fullName}
                />
              </TabsContent>

              {/* COMMUNICATIONS TAB */}
              <TabsContent value="communications">
                <CommunicationsTab
                  ownerId={ownerId}
                  showForm={showCommunicationForm}
                  onShowForm={setShowCommunicationForm}
                />
              </TabsContent>

              {/* BILLING TAB */}
              <TabsContent value="billing">
                <BillingTab
                  ownerId={ownerId}
                  bookings={ownerBookings}
                  lifetimeValue={lifetimeValue}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT COLUMN - STICKY SUMMARY PANEL */}
          <div className="w-full lg:w-[360px] flex-shrink-0">
            <div className="lg:sticky lg:top-[200px] space-y-4">
              <OwnerSummaryPanel
                owner={owner}
                stats={stats}
                pets={pets}
                totalBookings={totalBookings}
                lifetimeValue={lifetimeValue}
                onNewBooking={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}
                onNewCommunication={() => openSlideout(SLIDEOUT_TYPES.COMMUNICATION_CREATE, { ownerId })}
              />
            </div>
          </div>
        </div>
      </main>

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
// METRIC STRIP COMPONENT
// ============================================================================

function MetricStrip({ icon: Icon, label, value }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
      >
        <Icon className="w-5 h-5" style={{ color: 'var(--bb-color-accent)' }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
          {label}
        </p>
        <p className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// OWNER SUMMARY PANEL (RIGHT COLUMN)
// ============================================================================

function OwnerSummaryPanel({ owner, stats, pets, totalBookings, lifetimeValue, onNewBooking, onNewCommunication }) {
  const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Customer';
  const initials = `${owner.firstName?.[0] || ''}${owner.lastName?.[0] || ''}`.toUpperCase() || 'C';

  // Determine customer status
  const getCustomerStatus = () => {
    if (lifetimeValue > 100000) return { label: 'VIP', variant: 'accent' };
    if (totalBookings > 10) return { label: 'Frequent', variant: 'success' };
    if (totalBookings > 0) return { label: 'Active', variant: 'info' };
    return { label: 'New', variant: 'neutral' };
  };
  const customerStatus = getCustomerStatus();

  return (
    <Card className="overflow-hidden">
      {/* Profile Header */}
      <div
        className="p-6 text-center"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-2xl font-bold"
          style={{
            backgroundColor: 'var(--bb-color-accent)',
            color: 'var(--bb-color-text-on-accent)',
          }}
        >
          {initials}
        </div>
        <h3
          className="mt-4 text-lg font-semibold"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {fullName}
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
          {owner.address?.city || owner.city || 'Local'} customer
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant={customerStatus.variant}>{customerStatus.label}</Badge>
          {lifetimeValue > 50000 && (
            <Badge variant="warning">
              <Shield className="w-3 h-3" />
              High Value
            </Badge>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <h4
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          Contact
        </h4>
        <div className="space-y-3">
          {owner.email && (
            <ContactRow
              icon={Mail}
              value={owner.email}
              href={`mailto:${owner.email}`}
              onCopy={() => copyToClipboard(owner.email)}
            />
          )}
          {owner.phone && (
            <ContactRow
              icon={Phone}
              value={owner.phone}
              href={`tel:${owner.phone}`}
              onCopy={() => copyToClipboard(owner.phone)}
            />
          )}
          {(owner.address?.city || owner.city) && (
            <ContactRow
              icon={MapPin}
              value={`${owner.address?.street || ''} ${owner.address?.city || owner.city || ''}${owner.address?.state ? `, ${owner.address.state}` : ''} ${owner.address?.zip || ''}`.trim()}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <h4
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          Quick Actions
        </h4>
        <div className="space-y-2">
          <Button variant="primary" size="sm" className="w-full justify-start" onClick={onNewBooking}>
            <Calendar className="w-4 h-4" />
            New Booking
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={onNewCommunication}>
            <Send className="w-4 h-4" />
            Send Message
          </Button>
          {owner.phone && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => window.open(`tel:${owner.phone}`)}
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </Button>
          )}
        </div>
      </div>

      {/* Pets Summary */}
      {pets.length > 0 && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Pets ({pets.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {pets.slice(0, 4).map((pet) => (
              <Link
                key={pet.id || pet.recordId}
                to={`/pets/${pet.id || pet.recordId}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--bb-color-bg-elevated)',
                  color: 'var(--bb-color-text-primary)',
                }}
              >
                <PawPrint className="w-3.5 h-3.5" style={{ color: 'var(--bb-color-accent)' }} />
                {pet.name}
              </Link>
            ))}
            {pets.length > 4 && (
              <span
                className="px-3 py-1.5 rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--bb-color-bg-elevated)',
                  color: 'var(--bb-color-text-muted)',
                }}
              >
                +{pets.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Internal Notes */}
      {owner.notes && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <h4
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Internal Notes
          </h4>
          <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
            {owner.notes}
          </p>
        </div>
      )}
    </Card>
  );
}

function ContactRow({ icon: Icon, value, href, onCopy }) {
  return (
    <div className="flex items-center gap-3 group">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
      <div className="flex-1 min-w-0">
        {href ? (
          <a
            href={href}
            className="text-sm truncate block hover:text-[color:var(--bb-color-accent)] transition-colors"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {value}
          </a>
        ) : (
          <span className="text-sm truncate block" style={{ color: 'var(--bb-color-text-primary)' }}>
            {value}
          </span>
        )}
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ ownerId, owner, pets, upcomingBookings, recentBookings, stats, onTabChange, onLogActivity }) {
  const { openSlideout } = useSlideout();
  const { data: timelineData, isLoading: timelineLoading } = useCustomerTimeline(ownerId);
  const timeline = timelineData?.pages?.flatMap(page => page?.data || []) || [];

  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Activity
          </h3>
          <Button variant="ghost" size="sm" onClick={onLogActivity}>
            <Plus className="w-4 h-4" />
            Log Activity
          </Button>
        </div>

        {timelineLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Activity will appear here when bookings are made or communications are logged."
            action={
              <Button size="sm" onClick={onLogActivity}>
                <Plus className="w-4 h-4" />
                Log First Activity
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {timeline.slice(0, 5).map((item, index) => (
              <ActivityItem key={item.recordId || index} item={item} />
            ))}
            {timeline.length > 5 && (
              <button
                onClick={() => onTabChange('communications')}
                className="w-full text-sm font-medium py-2"
                style={{ color: 'var(--bb-color-accent)' }}
              >
                View all activity →
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Bookings Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Bookings
          </h3>
          <Button variant="link" size="sm" onClick={() => onTabChange('bookings')}>
            View all
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {upcomingBookings.length === 0 && recentBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Create the first booking for this customer."
            action={
              <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {upcomingBookings.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Upcoming
                </p>
                <div className="space-y-2">
                  {upcomingBookings.map((booking) => (
                    <BookingRow key={booking.id || booking.recordId} booking={booking} />
                  ))}
                </div>
              </div>
            )}
            {recentBookings.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Recent
                </p>
                <div className="space-y-2">
                  {recentBookings.map((booking) => (
                    <BookingRow key={booking.id || booking.recordId} booking={booking} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Pets Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Pets
          </h3>
          <Button variant="link" size="sm" onClick={() => onTabChange('pets')}>
            View all
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {pets.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="No pets registered"
            description="Add pets to this customer's profile."
            action={
              <Button size="sm" onClick={() => onTabChange('pets')}>
                <Plus className="w-4 h-4" />
                Add Pet
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pets.slice(0, 6).map((pet) => (
              <PetCard key={pet.id || pet.recordId} pet={pet} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ActivityItem({ item }) {
  const Icon = item.type === 'booking' ? Calendar
    : item.type === 'payment' ? DollarSign
    : item.type === 'communication' ? MessageSquare
    : FileText;

  return (
    <div className="flex gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          {item.title || item.content || 'Activity'}
        </p>
        {item.description && (
          <p className="text-sm truncate" style={{ color: 'var(--bb-color-text-muted)' }}>
            {item.description}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
          {safeFormatDistance(item.timestamp || item.createdAt)}
        </p>
      </div>
    </div>
  );
}

function BookingRow({ booking }) {
  return (
    <Link
      to={`/bookings/${booking.id || booking.recordId}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <Calendar className="w-5 h-5" style={{ color: 'var(--bb-color-accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          {safeFormatDate(booking.checkIn, 'MMM d')} – {safeFormatDate(booking.checkOut, 'MMM d, yyyy')}
        </p>
        <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
          {booking.petName || 'Pet'} • {formatCurrency(booking.totalPriceInCents || 0)}
        </p>
      </div>
      <Badge variant={getStatusVariant(booking.status)} size="sm">
        {booking.status || 'Pending'}
      </Badge>
    </Link>
  );
}

function PetCard({ pet }) {
  return (
    <Link
      to={`/pets/${pet.id || pet.recordId}`}
      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
      >
        <PawPrint className="w-5 h-5" style={{ color: 'var(--bb-color-accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
          {pet.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--bb-color-text-muted)' }}>
          {pet.breed || pet.species || 'Pet'}
        </p>
      </div>
    </Link>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-8">
      <div
        className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--bb-color-text-muted)' }} />
      </div>
      <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>{title}</p>
      <p className="text-sm mt-1 mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>{description}</p>
      {action}
    </div>
  );
}

// ============================================================================
// BOOKINGS TAB
// ============================================================================

function BookingsTab({ bookings, ownerName, ownerId }) {
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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          All Bookings ({bookings.length})
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm rounded-md border px-3 py-1.5"
            style={{
              backgroundColor: 'var(--bb-color-bg-surface)',
              borderColor: 'var(--bb-color-border-subtle)',
              color: 'var(--bb-color-text-primary)',
            }}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description={filter === 'all' ? `${ownerName} doesn't have any bookings yet.` : `No ${filter} bookings.`}
          action={
            <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
              <Plus className="w-4 h-4" />
              Create Booking
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <BookingRow key={booking.id || booking.recordId} booking={booking} />
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// PETS TAB
// ============================================================================

function PetsTab({ pets, ownerId, ownerName }) {
  const navigate = useNavigate();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Pets ({pets.length})
        </h3>
        <Button size="sm" onClick={() => navigate(`/pets?action=new&ownerId=${ownerId}`)}>
          <Plus className="w-4 h-4" />
          Add Pet
        </Button>
      </div>

      {pets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="No pets registered"
          description={`${ownerName} doesn't have any pets registered yet.`}
          action={
            <Button size="sm" onClick={() => navigate(`/pets?action=new&ownerId=${ownerId}`)}>
              <Plus className="w-4 h-4" />
              Add First Pet
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id || pet.recordId}
              onClick={() => navigate(`/pets/${pet.id || pet.recordId}`)}
              className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:border-[color:var(--bb-color-accent)] hover:shadow-sm"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
              >
                <PawPrint className="w-6 h-6" style={{ color: 'var(--bb-color-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {pet.name}
                  </p>
                  <Badge variant={pet.status === 'active' || !pet.status ? 'success' : 'neutral'} size="sm">
                    {pet.status || 'Active'}
                  </Badge>
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {[pet.species, pet.breed].filter(Boolean).join(' • ') || 'Pet'}
                </p>
                {pet.medicalNotes && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--bb-color-status-warning-text)' }}>
                    <AlertCircle className="w-3 h-3" />
                    Has medical notes
                  </p>
                )}
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--bb-color-text-muted)' }} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// COMMUNICATIONS TAB
// ============================================================================

function CommunicationsTab({ ownerId, showForm, onShowForm }) {
  const { data: timelineData, isLoading } = useCustomerTimeline(ownerId);
  const timeline = timelineData?.pages?.flatMap(page => page?.data || []) || [];

  return (
    <div className="space-y-4">
      {showForm && (
        <Card>
          <CommunicationForm
            ownerId={ownerId}
            onSuccess={() => onShowForm(false)}
            onCancel={() => onShowForm(false)}
          />
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Communications
          </h3>
          <Button size="sm" onClick={() => onShowForm(true)}>
            <Plus className="w-4 h-4" />
            New Message
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No communications"
            description="Start communicating with this customer by sending a message."
            action={
              <Button size="sm" onClick={() => onShowForm(true)}>
                <Plus className="w-4 h-4" />
                Send Message
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <ActivityItem key={item.recordId || index} item={item} />
            ))}
          </div>
        )}
      </Card>

      {/* Notes Section */}
      <NotesPanel entityType="owner" entityId={ownerId} />
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
            Lifetime Value
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--bb-color-text-primary)' }}>
            {formatCurrency(lifetimeValue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
            Total Paid
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--bb-color-status-positive-text)' }}>
            {formatCurrency(totalPaid)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
            Outstanding
          </p>
          <p
            className="text-2xl font-bold mt-1"
            style={{ color: outstanding > 0 ? 'var(--bb-color-status-warning-text)' : 'var(--bb-color-text-primary)' }}
          >
            {formatCurrency(outstanding)}
          </p>
        </Card>
      </div>

      {/* Invoice History Placeholder */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Invoice History
          </h3>
        </div>
        <EmptyState
          icon={CreditCard}
          title="Invoice history coming soon"
          description="Detailed invoice tracking will be available here."
        />
      </Card>
    </div>
  );
}
