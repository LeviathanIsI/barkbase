import { useMemo, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
  Edit, Move, AlertTriangle, Plus, X, PawPrint,
  User, Phone, Calendar, Trash2, Wrench, CheckCircle,
  Home, Settings, ChevronLeft
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import SlidePanel from '@/components/ui/SlidePanel';
import { useKennels, useUpdateKennel, useDeleteKennel } from '@/features/kennels/api';
import { useBookingsQuery } from '@/features/bookings/api';
import KennelForm from '@/features/kennels/components/KennelForm';
import { useOccupancyQuery, useAssignKennelMutation, useReassignKennelMutation } from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

const KennelLayoutView = ({ currentDate, onBookingClick }) => {
  // Panel states
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [showKennelDetail, setShowKennelDetail] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [showAddKennel, setShowAddKennel] = useState(false);

  const dayStart = startOfDay(currentDate || new Date());
  const dayEnd = endOfDay(currentDate || new Date());

  // Data sources
  const { data: kennels = [], isLoading: kennelsLoading, refetch: refetchKennels } = useKennels();
  const { data: occupancyData, isLoading: occupancyLoading, refetch: refetchOccupancy } = useOccupancyQuery({
    from: format(dayStart, 'yyyy-MM-dd'),
    to: format(dayEnd, 'yyyy-MM-dd'),
  });
  const { data: bookings = [] } = useBookingsQuery();

  // Mutations (only need assign for add kennel modal)
  // Other mutations are now inside KennelDetailPanel

  // Merge occupancy into kennels list
  const groupedByBuilding = useMemo(() => {
    const byId = new Map();
    (occupancyData?.kennels || []).forEach((k) => {
      const id = k.kennel?.recordId || k.kennel?.id || k.kennelId;
      if (id) byId.set(id, k);
    });

    const merged = kennels.map((k) => {
      const occ = byId.get(k.recordId);
      return {
        ...k,
        occupied: occ?.occupied ?? k.occupied ?? 0,
        available: occ?.available ?? Math.max((k.capacity || 0) - (k.occupied || 0), 0),
        bookings: occ?.bookings || [],
      };
    });

    const groups = merged.reduce((acc, k) => {
      const building = k.building || 'General';
      const floor = k.floor || 'Main Floor';
      const key = `${building} - ${floor}`;
      acc[key] = acc[key] || [];
      acc[key].push(k);
      return acc;
    }, {});

    return Object.entries(groups).map(([label, list]) => ({ label, list }));
  }, [kennels, occupancyData]);

  const totalCapacity = useMemo(() => kennels.reduce((s, k) => s + (k.capacity || 0), 0), [kennels]);
  const totalOccupied = useMemo(() => groupedByBuilding.reduce((s, g) => s + g.list.reduce((x, k) => x + (k.occupied || 0), 0), 0), [groupedByBuilding]);
  const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
  const utilizationPercent = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  // Handle kennel click - opens detail slideout
  const handleKennelClick = (kennel) => {
    setSelectedKennel(kennel);
    setShowKennelDetail(true);
  };

  // Close kennel detail and reset
  const closeKennelDetail = () => {
    setShowKennelDetail(false);
    setSelectedKennel(null);
  };

  // Refetch data after mutations
  const handleMutationSuccess = () => {
    refetchKennels();
    refetchOccupancy();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Kennel Layout</h2>
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Visual overview of your facility</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowEditMode(!showEditMode)}
          className={cn(showEditMode && 'ring-2 ring-[var(--bb-color-accent)]')}
        >
          <Edit className="w-4 h-4 mr-2" />
          {showEditMode ? 'Done Editing' : 'Edit Layout'}
        </Button>
      </div>

      {/* Edit Mode Banner */}
      {showEditMode && (
        <div
          className="flex items-center justify-between rounded-lg border p-3"
          style={{ backgroundColor: 'var(--bb-color-accent-soft)', borderColor: 'var(--bb-color-accent)' }}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
            <span className="text-sm font-medium text-[color:var(--bb-color-accent)]">
              Edit mode active - Click any kennel to edit or delete it
            </span>
          </div>
          <Button size="sm" onClick={() => setShowAddKennel(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Kennel
          </Button>
        </div>
      )}

      {/* Kennel Grid */}
      {(kennelsLoading || occupancyLoading) ? (
        <Skeleton className="h-64" />
      ) : kennels.length === 0 ? (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-[color:var(--bb-color-text-muted)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">No Kennels Configured</h3>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">Add kennels to start managing your facility</p>
          <Button onClick={() => setShowAddKennel(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Kennel
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByBuilding.map((group) => (
            <div key={group.label}>
              <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-4">{group.label}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.list.map((kennel) => {
                  const isOccupied = kennel.occupied > 0;
                  const isInMaintenance = kennel.isActive === false;

                  return (
                    <button
                      key={kennel.recordId}
                      type="button"
                      onClick={() => handleKennelClick(kennel)}
                      className={cn(
                        'border-2 rounded-lg p-4 text-left transition-all',
                        'hover:shadow-md hover:-translate-y-0.5',
                        'focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]',
                        isInMaintenance && 'border-amber-400 bg-amber-50 dark:bg-amber-900/20',
                        isOccupied && !isInMaintenance && 'border-green-400 bg-green-50 dark:bg-green-900/20',
                        !isOccupied && !isInMaintenance && 'border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]'
                      )}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-[color:var(--bb-color-text-primary)]">{kennel.name}</div>
                        <div className="text-sm text-[color:var(--bb-color-text-muted)]">Cap {kennel.capacity ?? 1}</div>

                        {isInMaintenance ? (
                          <div className="mt-2">
                            <Badge variant="warning" size="sm">
                              <Wrench className="h-3 w-3 mr-1" />
                              Maintenance
                            </Badge>
                          </div>
                        ) : isOccupied ? (
                          <div className="mt-2 space-y-1">
                            {(kennel.bookings || []).slice(0, 2).map((b) => (
                              <div key={b.segmentId || b.bookingId} className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <PawPrint className="h-3 w-3 inline mr-1" />
                                {b.petName || 'Occupied'}
                              </div>
                            ))}
                            {(kennel.bookings?.length || 0) > 2 && (
                              <div className="text-xs text-[color:var(--bb-color-text-muted)]">
                                +{kennel.bookings.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              OPEN
                            </Badge>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Color Legend */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3">Legend</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-400 bg-green-50 dark:bg-green-900/20" />
            <span className="text-sm text-[color:var(--bb-color-text-secondary)]">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]" />
            <span className="text-sm text-[color:var(--bb-color-text-secondary)]">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20" />
            <span className="text-sm text-[color:var(--bb-color-text-secondary)]">Maintenance</span>
          </div>
        </div>
      </div>

      {/* Capacity Summary */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--bb-color-status-info-soft)', borderColor: 'var(--bb-color-status-info)' }}
      >
        <div className="font-semibold text-[color:var(--bb-color-status-info-text)]">
          CAPACITY: {totalOccupied}/{totalCapacity} kennels occupied ({utilizationPercent}%)
        </div>
        <div className="text-sm text-[color:var(--bb-color-status-info-text)] opacity-80">
          • {totalAvailable} available now
        </div>
      </div>

      {/* Kennel Detail Slideout */}
      <SlidePanel
        open={showKennelDetail}
        onClose={closeKennelDetail}
        title={selectedKennel?.name || 'Kennel Details'}
      >
        {selectedKennel && (
          <KennelDetailPanel
            kennel={selectedKennel}
            kennels={kennels}
            bookings={bookings}
            onClose={closeKennelDetail}
            onBookingClick={onBookingClick}
            onSuccess={handleMutationSuccess}
            dayStart={dayStart}
            dayEnd={dayEnd}
          />
        )}
      </SlidePanel>

      {/* Add Kennel Modal */}
      {showAddKennel && (
        <KennelForm
          kennel={null}
          onClose={() => setShowAddKennel(false)}
          onSuccess={() => {
            setShowAddKennel(false);
            handleMutationSuccess();
          }}
          terminology={{ kennel: 'Kennel', suite: 'Suite', cabin: 'Cabin', daycare: 'Daycare', medical: 'Medical' }}
        />
      )}
    </div>
  );
};

// Kennel Detail Panel - Shows kennel info and actions (all inline, no modals)
const KennelDetailPanel = ({
  kennel,
  kennels,
  bookings,
  onClose,
  onBookingClick,
  onSuccess,
  dayStart,
  dayEnd,
}) => {
  const [activeView, setActiveView] = useState('details'); // 'details' | 'assign' | 'move' | 'maintenance' | 'edit' | 'delete'

  const isOccupied = kennel.occupied > 0;
  const isInMaintenance = kennel.isActive === false;

  // Mutations
  const assignMutation = useAssignKennelMutation();
  const reassignMutation = useReassignKennelMutation();
  const updateKennelMutation = useUpdateKennel(kennel.recordId);
  const deleteKennelMutation = useDeleteKennel();

  // Assign form state
  const [assignForm, setAssignForm] = useState({
    bookingId: '',
    kennelId: kennel.recordId,
    startDate: format(dayStart, 'yyyy-MM-dd'),
    endDate: format(dayEnd, 'yyyy-MM-dd')
  });

  // Move form state
  const [moveForm, setMoveForm] = useState({ segmentId: '', kennelId: '' });

  // Filter bookings for assign
  const availableBookings = bookings.filter(b =>
    b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED'
  );

  // Current occupants for move
  const currentOccupants = kennel.bookings || [];

  // Available kennels for move (exclude current)
  const availableKennels = kennels.filter(k => k.recordId !== kennel.recordId);

  // Handlers
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await assignMutation.mutateAsync(assignForm);
      toast.success('Pet assigned to kennel');
      onSuccess?.();
      setActiveView('details');
    } catch (error) {
      toast.error(error?.message || 'Failed to assign kennel');
    }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    try {
      await reassignMutation.mutateAsync(moveForm);
      toast.success('Pet moved successfully');
      onSuccess?.();
      setActiveView('details');
    } catch (error) {
      toast.error(error?.message || 'Failed to move pet');
    }
  };

  const handleMaintenance = async () => {
    try {
      await updateKennelMutation.mutateAsync({ isActive: isInMaintenance ? true : false });
      toast.success(isInMaintenance ? 'Kennel restored to active' : 'Kennel marked for maintenance');
      onSuccess?.();
      setActiveView('details');
    } catch (error) {
      toast.error(error?.message || 'Failed to update kennel');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteKennelMutation.mutateAsync(kennel.recordId);
      toast.success(`${kennel.name} deleted`);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to delete kennel');
    }
  };

  // Back button for sub-views
  const BackButton = () => (
    <button
      type="button"
      onClick={() => setActiveView('details')}
      className="flex items-center gap-1 text-sm text-[color:var(--bb-color-accent)] hover:underline mb-4"
    >
      <ChevronLeft className="h-4 w-4" />
      Back to Details
    </button>
  );

  // ASSIGN VIEW
  if (activeView === 'assign') {
    return (
      <div className="space-y-4">
        <BackButton />
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
          Assign Pet to {kennel.name}
        </h3>
        <form onSubmit={handleAssign} className="space-y-4">
          <Select
            label="Select Booking"
            value={assignForm.bookingId}
            onChange={(e) => setAssignForm({ ...assignForm, bookingId: e.target.value })}
            required
            options={[
              { value: '', label: 'Select a booking...' },
              ...availableBookings.map((b) => {
                const id = b.recordId || b.bookingId || b.id;
                const petName = b.pet?.name || b.petName || 'Unknown Pet';
                const ownerName = b.owner?.name || b.ownerName || '';
                return { value: id, label: `${petName}${ownerName ? ` (${ownerName})` : ''}` };
              }),
            ]}
            menuPortalTarget={document.body}
          />
          <div className="grid gap-3 grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={assignForm.startDate}
              onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={assignForm.endDate}
              onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveView('details')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={assignMutation.isPending} className="flex-1">
              Assign Pet
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // MOVE VIEW
  if (activeView === 'move') {
    return (
      <div className="space-y-4">
        <BackButton />
        <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
          Move Pet from {kennel.name}
        </h3>
        <form onSubmit={handleMove} className="space-y-4">
          <Select
            label="Select Pet to Move"
            value={moveForm.segmentId}
            onChange={(e) => setMoveForm({ ...moveForm, segmentId: e.target.value })}
            required
            options={[
              { value: '', label: 'Select a pet...' },
              ...currentOccupants.map((seg) => ({
                value: seg.segmentId || seg.recordId,
                label: seg.petName || 'Unknown Pet',
              })),
            ]}
            menuPortalTarget={document.body}
          />
          <Select
            label="Move to Kennel"
            value={moveForm.kennelId}
            onChange={(e) => setMoveForm({ ...moveForm, kennelId: e.target.value })}
            required
            options={[
              { value: '', label: 'Select target kennel...' },
              ...availableKennels.map((k) => ({
                value: k.recordId,
                label: `${k.name} (${k.occupied || 0}/${k.capacity || 1})`,
              })),
            ]}
            menuPortalTarget={document.body}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveView('details')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={reassignMutation.isPending} className="flex-1">
              Move Pet
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // MAINTENANCE VIEW
  if (activeView === 'maintenance') {
    return (
      <div className="space-y-4">
        <BackButton />
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isInMaintenance ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          )}>
            {isInMaintenance ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              {isInMaintenance ? 'Restore Kennel' : 'Mark Maintenance'}
            </h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">{kennel.name}</p>
          </div>
        </div>
        <p className="text-sm text-[color:var(--bb-color-text-secondary)]">
          {isInMaintenance
            ? 'This will restore the kennel to active status and make it available for bookings.'
            : 'This will mark the kennel as under maintenance and prevent new bookings.'
          }
        </p>
        {kennel.occupied > 0 && !isInMaintenance && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              This kennel has {kennel.occupied} current occupant(s). They will not be affected.
            </p>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setActiveView('details')} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleMaintenance}
            variant={isInMaintenance ? 'primary' : 'warning'}
            loading={updateKennelMutation.isPending}
            className="flex-1"
          >
            {isInMaintenance ? 'Restore to Active' : 'Mark Maintenance'}
          </Button>
        </div>
      </div>
    );
  }

  // DELETE VIEW
  if (activeView === 'delete') {
    return (
      <div className="space-y-4">
        <BackButton />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">Delete Kennel</h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-[color:var(--bb-color-text-secondary)]">
          Are you sure you want to delete <strong>{kennel.name}</strong>?
          {kennel.occupied > 0 && (
            <span className="text-red-600"> This kennel currently has {kennel.occupied} occupant(s).</span>
          )}
        </p>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setActiveView('details')} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteKennelMutation.isPending}
            className="flex-1"
          >
            Delete Kennel
          </Button>
        </div>
      </div>
    );
  }

  // DEFAULT DETAILS VIEW
  return (
    <div className="space-y-6">
      {/* Kennel Info */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">{kennel.name}</h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              {kennel.building && `${kennel.building}`}
              {kennel.floor && ` • ${kennel.floor}`}
            </p>
          </div>
          <Badge
            variant={isInMaintenance ? 'warning' : isOccupied ? 'success' : 'info'}
          >
            {isInMaintenance ? 'Maintenance' : isOccupied ? 'Occupied' : 'Available'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[color:var(--bb-color-text-muted)]">Capacity:</span>
            <span className="ml-2 font-medium text-[color:var(--bb-color-text-primary)]">{kennel.capacity || 1}</span>
          </div>
          <div>
            <span className="text-[color:var(--bb-color-text-muted)]">Type:</span>
            <span className="ml-2 font-medium text-[color:var(--bb-color-text-primary)]">{kennel.type || 'Standard'}</span>
          </div>
          <div>
            <span className="text-[color:var(--bb-color-text-muted)]">Current:</span>
            <span className="ml-2 font-medium text-[color:var(--bb-color-text-primary)]">{kennel.occupied || 0} / {kennel.capacity || 1}</span>
          </div>
          <div>
            <span className="text-[color:var(--bb-color-text-muted)]">Size:</span>
            <span className="ml-2 font-medium text-[color:var(--bb-color-text-primary)]">{kennel.size || 'Standard'}</span>
          </div>
        </div>
      </div>

      {/* Current Occupants */}
      {isOccupied && kennel.bookings?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3">Current Occupants</h4>
          <div className="space-y-2">
            {kennel.bookings.map((booking) => (
              <button
                key={booking.segmentId || booking.bookingId}
                type="button"
                onClick={() => onBookingClick?.(booking)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md hover:border-[var(--bb-color-accent)]"
                style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bb-color-accent)] text-white shrink-0">
                  <PawPrint className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-[color:var(--bb-color-text-primary)]">{booking.petName || 'Unknown Pet'}</p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                    {booking.ownerName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {booking.ownerName}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant="success" size="sm">Checked In</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div>
        <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3">Actions</h4>
        <div className="space-y-2">
          {/* Assign Pet - only show if not at capacity */}
          {!isInMaintenance && (kennel.occupied || 0) < (kennel.capacity || 1) && (
            <Button variant="outline" className="w-full justify-start" onClick={() => setActiveView('assign')}>
              <PawPrint className="h-4 w-4 mr-2" />
              Assign Pet to This Kennel
            </Button>
          )}

          {/* Move Pet - only show if occupied */}
          {isOccupied && (
            <Button variant="outline" className="w-full justify-start" onClick={() => setActiveView('move')}>
              <Move className="h-4 w-4 mr-2" />
              Move Pet to Another Kennel
            </Button>
          )}

          {/* Mark Maintenance */}
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setActiveView('maintenance')}
          >
            <Wrench className="h-4 w-4 mr-2" />
            {isInMaintenance ? 'Remove from Maintenance' : 'Mark as Maintenance'}
          </Button>

          {/* Edit Kennel */}
          <Button variant="outline" className="w-full justify-start" onClick={() => setActiveView('edit')}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Kennel Details
          </Button>

          {/* Delete Kennel */}
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => setActiveView('delete')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Kennel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KennelLayoutView;
