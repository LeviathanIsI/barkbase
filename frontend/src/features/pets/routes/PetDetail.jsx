import { useMemo, useState } from 'react';
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
  useUpdatePetMutation,
  usePetVaccinationsQuery,
  useCreateVaccinationMutation,
  useUpdateVaccinationMutation,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { PetFormModal, VaccinationFormModal } from '../components';

const PetDetail = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  const petQuery = usePetQuery(petId);
  const deletePetMutation = useDeletePetMutation();
  const updatePetMutation = useUpdatePetMutation(petId);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Vaccination modal state
  const [vaccinationModalOpen, setVaccinationModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [selectedVaccineType, setSelectedVaccineType] = useState('');

  // Vaccination mutations
  const createVaccinationMutation = useCreateVaccinationMutation(petId);
  const updateVaccinationMutation = useUpdateVaccinationMutation(petId);

  const pet = petQuery.data;
  const { data: vaccinations = [], isLoading: vaccLoading } = usePetVaccinationsQuery(petId);


  // Helper functions for vaccinations
  const getDefaultVaccines = (species) => {
    if (species === 'Dog') {
      return ['Rabies', 'DAPP', 'DHPP', 'Bordetella', 'Influenza', 'Leptospirosis'];
    } else if (species === 'Cat') {
      return ['Rabies', 'FVRCP', 'FeLV'];
    }
    // If no species is set, show common vaccines
    return ['Rabies', 'DAPP', 'DHPP'];
  };

  const normalizeVaccineType = (type) => {
    const normalized = type?.toLowerCase()?.trim();
    if (normalized === 'dhpp' || normalized === 'dapp/dhpp') return 'dapp';
    if (normalized === 'fvr' || normalized === 'fvr/c') return 'fvrcp';
    return normalized;
  };

  const getVaccinationStatus = (vaccination) => {
    if (!vaccination) return 'missing';
    const now = new Date();
    const expiresAt = new Date(vaccination.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (expiresAt < now) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'up to date';
  };

  const getVaccinationForType = (type) => {
    const normalizedType = normalizeVaccineType(type);
    // Find all vaccinations of this type and return the most recent one (by administeredAt)
    const matchingVaccinations = vaccinations.filter(v => normalizeVaccineType(v.type) === normalizedType);
    const found = matchingVaccinations.sort((a, b) => new Date(b.administeredAt) - new Date(a.administeredAt))[0];
    return found;
  };

  const handleAddVaccination = (vaccineType) => {
    setSelectedVaccineType(vaccineType);
    setEditingVaccination(null);
    setVaccinationModalOpen(true);
  };

  const handleEditVaccination = (vaccination) => {
    setEditingVaccination(vaccination);
    setSelectedVaccineType('');
    setVaccinationModalOpen(true);
  };

  const handleVaccinationSubmit = async (data) => {
    try {
      if (editingVaccination) {
        await updateVaccinationMutation.mutateAsync({
          vaccinationId: editingVaccination.recordId,
          payload: data
        });
        toast.success('Vaccination updated successfully');
      } else {
        await createVaccinationMutation.mutateAsync(data);
        toast.success('Vaccination added successfully');
      }
      setVaccinationModalOpen(false);
      setEditingVaccination(null);
      setSelectedVaccineType('');
    } catch (error) {
      console.error('Failed to save vaccination:', error);
      toast.error(error?.message || 'Failed to save vaccination');
    }
  };

  const asideSections = useMemo(() => {
    if (!pet) return [];

    return [
      { recordId: 'owners',
        title: `Owners (${(pet.owners || []).length})`,
        render: (record) => {
          const recordOwners = record?.owners || [];
          if (recordOwners.length === 0) {
            return <p className="text-sm text-muted">No owners linked</p>;
          }

          return (
            <div className="space-y-2">
              {recordOwners.map((owner) => (
                <div key={owner.recordId} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
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
      { recordId: 'activity',
        title: 'Recent Activity',
        render: (record) => {
          const recent = (record?.bookings || []).slice(0, 3);
          if (recent.length === 0) {
            return <p className="text-sm text-muted">No recent activity</p>;
          }

          return (
            <div className="space-y-2">
              {recent.map((booking) => (
                <div key={booking.recordId} className="rounded-md border border-border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted" />
                    <span className="text-xs font-medium text-muted">
                      {new Date(booking.checkIn).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    Booking #{booking.recordId.slice(0, 8)}
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
    ];
  }, [pet]);

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
    { recordId: 'overview',
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
    { recordId: 'bookings',
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
                  key={booking.recordId}
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
    { recordId: 'vaccinations',
      label: 'Vaccinations',
      render: (record) => {
        const defaultVaccines = getDefaultVaccines(record.species);
        return (
          <SectionCard title="Vaccinations" variant="spacious">
            <div className="space-y-4">
              {vaccLoading && (
                <p className="text-sm text-muted">Loading vaccinations…</p>
              )}
              {!vaccLoading && (
                <>
                  {/* Default vaccine cards */}
                  <div className="grid gap-3">
                    {defaultVaccines.map((vaccineType) => {
                      const vaccination = getVaccinationForType(vaccineType);
                      const status = getVaccinationStatus(vaccination);

                      return (
                        <div
                          key={vaccineType}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                              <Syringe className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{vaccineType}</p>
                              {vaccination ? (
                                <div>
                                  <p className="text-sm text-muted">
                                    Expires {new Date(vaccination.expiresAt).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-muted">
                                    Type in DB: "{vaccination.type}" | ID: {vaccination.recordId.slice(0, 8)}...
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm text-muted">Not recorded</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill
                              status={status === 'up to date' ? 'active' :
                                     status === 'expiring' ? 'warning' :
                                     status === 'expired' ? 'error' : 'inactive'}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => vaccination
                                ? handleEditVaccination(vaccination)
                                : handleAddVaccination(vaccineType)
                              }
                            >
                              {vaccination ? 'Edit' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* All existing vaccinations */}
                  {vaccinations.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h3 className="text-sm font-medium text-text mb-3">All Vaccinations in Database</h3>
                      <div className="space-y-3">
                        {vaccinations.map((vaccine) => {
                          const status = getVaccinationStatus(vaccine);
                          return (
                            <div
                              key={vaccine.recordId}
                              className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                            >
                              <div>
                                <p className="font-medium">{vaccine.type}</p>
                                <p className="text-sm text-muted flex items-center gap-2">
                                  <Syringe className="h-3.5 w-3.5" />
                                  Administered {new Date(vaccine.administeredAt).toLocaleDateString()}
                                  (expires {vaccine.expiresAt ? new Date(vaccine.expiresAt).toLocaleDateString() : 'N/A'})
                                </p>
                                <p className="text-xs text-muted">
                                  Record ID: {vaccine.recordId.slice(0, 8)}...
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusPill
                                  status={status === 'up to date' ? 'active' :
                                         status === 'expiring' ? 'warning' :
                                         status === 'expired' ? 'error' : 'inactive'}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditVaccination(vaccine)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add custom vaccine button */}
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleAddVaccination('')}
                      className="w-full"
                    >
                      + Add Custom Vaccine
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        );
      },
    },
  ], []);

  if (petQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading pet details...
      </div>
    );
  }

  if (!pet) {
    return <div className="p-8">Pet not found</div>;
  }

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (data) => {
    try {
      await updatePetMutation.mutateAsync(data);
      setEditModalOpen(false);
      // Refetch the pet data to show updated info
      queryClient.invalidateQueries({ queryKey: [...queryKeys.pets(tenantKey), petId] });
      toast.success('Pet updated successfully');
    } catch (error) {
      console.error('Failed to update pet:', error);
      // Error handling will be shown in the form
    }
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

  return (
    <>
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

      <PetFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        pet={pet}
        onSubmit={handleEditSubmit}
        isLoading={updatePetMutation.isPending}
      />

      <VaccinationFormModal
        open={vaccinationModalOpen}
        onClose={() => {
          setVaccinationModalOpen(false);
          setEditingVaccination(null);
          setSelectedVaccineType('');
        }}
        vaccination={editingVaccination}
        petSpecies={pet?.species}
        selectedVaccineType={selectedVaccineType}
        onSubmit={handleVaccinationSubmit}
        isLoading={createVaccinationMutation.isPending || updateVaccinationMutation.isPending}
      />
    </>
  );
};

export default PetDetail;
