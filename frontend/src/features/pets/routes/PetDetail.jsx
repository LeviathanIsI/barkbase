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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RecordDetailsView from '@/components/RecordDetailsView';
import { SectionCard, InfoRow, StatusPill } from '@/components/primitives';
import {
  usePetQuery,
  useDeletePetMutation,
  useUpdatePetMutation,
  usePetVaccinationsQuery,
  useCreateVaccinationMutation,
  useUpdateVaccinationMutation,
  useDeleteVaccinationMutation,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePetDialogOpen, setDeletePetDialogOpen] = useState(false);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

  // Vaccination mutations
  const createVaccinationMutation = useCreateVaccinationMutation(petId);
  const updateVaccinationMutation = useUpdateVaccinationMutation(petId);
  const deleteVaccinationMutation = useDeleteVaccinationMutation(petId);

  const pet = petQuery.data;
  if (petQuery.data) {
  }
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

  const getStatusDisplay = (status) => {
    if (status === 'up to date') return { label: 'Up to date', intent: 'active' };
    if (status === 'expiring') return { label: 'Due soon', intent: 'warning' };
    if (status === 'expired' || status === 'missing') return { label: 'Due', intent: 'canceled' };
    return { label: 'Due', intent: 'inactive' };
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

  const handleDeleteClick = (vaccination) => {
    setVaccinationToDelete(vaccination);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vaccinationToDelete) return;

    setIsDeleting(true);
    try {
      await deleteVaccinationMutation.mutateAsync(vaccinationToDelete.recordId);
      toast.success('Vaccination deleted successfully');
      setDeleteDialogOpen(false);
      setVaccinationToDelete(null);
    } catch (error) {
      console.error('Failed to delete vaccination:', error);
      toast.error(error?.message || 'Failed to delete vaccination');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setVaccinationToDelete(null);
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
                                </div>
                              ) : (
                                <p className="text-sm text-muted">Not recorded</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const { label, intent } = getStatusDisplay(status);
                              return (
                                <StatusPill intent={intent}>{label}</StatusPill>
                              );
                            })()}
                            {vaccination ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditVaccination(vaccination)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteClick(vaccination)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAddVaccination(vaccineType)}
                              >
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  

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
  ], [vaccinations, vaccLoading]);

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

  const handleDelete = () => {
    setDeletePetDialogOpen(true);
  };

  const handleConfirmPetDelete = async () => {
    setIsDeletingPet(true);
    try {
      await deletePetMutation.mutateAsync(petId);
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
      toast.success('Pet deleted successfully');
      navigate('/pets');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete pet');
    } finally {
      setIsDeletingPet(false);
      setDeletePetDialogOpen(false);
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

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Vaccination"
        message={`Are you sure you want to delete the ${vaccinationToDelete?.type} vaccination? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={deletePetDialogOpen}
        onClose={() => setDeletePetDialogOpen(false)}
        onConfirm={handleConfirmPetDelete}
        title="Delete Pet"
        message={`Are you sure you want to delete ${pet?.name}? This will permanently remove all associated records including vaccinations and bookings. This action cannot be undone.`}
        confirmText="Delete Pet"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingPet}
      />
    </>
  );
};

export default PetDetail;
