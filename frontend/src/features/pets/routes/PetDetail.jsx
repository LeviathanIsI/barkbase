import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PawPrint,
  Edit,
  Trash2,
  Calendar,
  Syringe,
  User,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import RecordDetailsView from '@/components/RecordDetailsView';
import { SectionCard, InfoRow, StatusPill } from '@/components/primitives';
import {
  usePetQuery,
  useDeletePetMutation,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';

const PetDetail = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  const petQuery = usePetQuery(petId);
  const deletePetMutation = useDeletePetMutation();

  if (petQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading pet details...
      </div>
    );
  }

  const pet = petQuery.data;

  if (!pet) {
    return <div className="p-8">Pet not found</div>;
  }

  const handleEdit = () => {
    toast.info('Edit functionality coming soon');
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this pet?')) return;
    try {
      await deletePetMutation.mutateAsync(petId);
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
      toast.success('Pet deleted successfully');
      navigate('/pets');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete pet');
    }
  };

  const actions = (
    <div className="flex items-center gap-2">
      <Button size="sm" icon={<Edit className="h-4 w-4" />} onClick={handleEdit}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<Trash2 className="h-4 w-4" />}
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );

  const summaryProps = useMemo(() => ({
    avatar: (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <PawPrint className="h-8 w-8" />
      </div>
    ),
    actionButtons: [
      {
        label: 'Log Visit',
        icon: <ClipboardList className="h-4 w-4" />,
        onClick: () => toast.info('Logging visits coming soon'),
      },
    ],
  }), []);

  const tabs = useMemo(() => [
    {
      id: 'overview',
      label: 'Overview',
      render: (record) => (
        <SectionCard title="Health & Care">
          <div className="space-y-3">
            <InfoRow label="Weight" value={record.weight ? `${record.weight} lbs` : null} />
            <InfoRow
              label="Diet Notes"
              value={record.dietaryNotes || 'Not provided'}
            />
            <InfoRow
              label="Last Vet Visit"
              value={record.lastVetVisit ? new Date(record.lastVetVisit).toLocaleDateString() : 'Unknown'}
            />
            <InfoRow
              label="Next Appointment"
              value={record.nextAppointment ? new Date(record.nextAppointment).toLocaleDateString() : 'Not scheduled'}
            />
          </div>
        </SectionCard>
      ),
    },
    {
      id: 'bookings',
      label: 'Bookings',
      render: (record) => {
        const allBookings = record?.bookings || [];
        return (
          <SectionCard title="Bookings" variant="spacious">
            <div className="space-y-3">
              {allBookings.length === 0 && (
                <p className="text-sm text-muted">No bookings yet</p>
              )}
              {allBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      Booking #{booking.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(booking.checkIn).toLocaleDateString()} –{' '}
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={booking.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        );
      },
    },
    {
      id: 'vaccinations',
      label: 'Vaccinations',
      render: (record) => {
        const vaccines = record?.vaccinations || [];
        return (
          <SectionCard title="Vaccination Records" variant="spacious">
            <div className="space-y-3">
              {vaccines.length === 0 && (
                <p className="text-sm text-muted">No vaccinations recorded</p>
              )}
              {vaccines.map((vaccine) => (
                <div
                  key={vaccine.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{vaccine.type}</p>
                    <p className="text-sm text-muted flex items-center gap-2">
                      <Syringe className="h-3.5 w-3.5" />
                      {new Date(vaccine.date).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={vaccine.status ?? 'up to date'} />
                </div>
              ))}
            </div>
          </SectionCard>
        );
      },
    },
  ], []);

  const asideSections = useMemo(() => [
    {
      id: 'owners',
      title: `Owners (${(pet.owners || []).length})`,
      render: (record) => {
        const recordOwners = record?.owners || [];
        if (recordOwners.length === 0) {
          return <p className="text-sm text-muted">No owners linked</p>;
        }

        return (
          <div className="space-y-2">
            {recordOwners.map((owner) => (
              <div key={owner.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {owner.name || `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim()}
                  </p>
                  <p className="text-xs text-muted">{owner.email}</p>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: 'activity',
      title: 'Recent Activity',
      render: (record) => {
        const recent = (record?.bookings || []).slice(0, 3);
        if (recent.length === 0) {
          return <p className="text-sm text-muted">No recent activity</p>;
        }

        return (
          <div className="space-y-2">
            {recent.map((booking) => (
              <div key={booking.id} className="rounded-md border border-border p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted" />
                  <span className="text-xs font-medium text-muted">
                    {new Date(booking.checkIn).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium">
                  Booking #{booking.id.slice(0, 8)}
                </p>
                <div className="mt-1">
                  <StatusPill status={booking.status} />
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
  ], [pet]);

  return (
    <RecordDetailsView
      objectType="pet"
      recordId={petId}
      data={pet}
      fetchOnMount={false}
      title={pet.name}
      subtitle={pet.breed}
      actions={actions}
      summaryTitle="Pet Summary"
      summaryProps={summaryProps}
      tabs={tabs}
      asideSections={asideSections}
    />
  );
};

export default PetDetail;
