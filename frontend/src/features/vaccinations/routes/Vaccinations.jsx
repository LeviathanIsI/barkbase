import { useMemo, useState } from 'react';
import { Shield, RefreshCw, Search, AlertTriangle, Calendar, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useExpiringVaccinationsQuery } from '@/features/pets/api-vaccinations';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const Vaccinations = () => {
  const [daysAhead, setDaysAhead] = useState('90');
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const effectiveDaysAhead = daysAhead === 'ALL' ? 36500 : Number(daysAhead);
  const { data, isLoading, refetch, isFetching } = useExpiringVaccinationsQuery(effectiveDaysAhead);

  // Helper to detect if a vaccine is appropriate for the pet's species
  const isVaccineAppropriate = (vaccine, species) => {
    const dogOnlyVaccines = ['DAPP', 'DHPP', 'Bordetella', 'Leptospirosis', 'Influenza'];
    const catOnlyVaccines = ['FVRCP', 'FeLV'];
    
    const normalizedType = vaccine?.toLowerCase();
    const normalizedSpecies = species?.toLowerCase();
    
    if (normalizedSpecies === 'dog') {
      return !catOnlyVaccines.some(v => v.toLowerCase() === normalizedType);
    } else if (normalizedSpecies === 'cat') {
      return !dogOnlyVaccines.some(v => v.toLowerCase() === normalizedType);
    }
    return true; // For unknown species, don't show warning
  };

  const records = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((v) =>
      (v.petName || '').toLowerCase().includes(q) ||
      (v.type || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleDeleteClick = (vaccination) => {
    setVaccinationToDelete(vaccination);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vaccinationToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/v1/pets/${vaccinationToDelete.petId}/vaccinations/${vaccinationToDelete.recordId}`);
      toast.success('Vaccination deleted successfully');
      // Invalidate and refetch the list
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'expiring'] });
      refetch();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vaccinations"
        breadcrumb={<span>Clients / Vaccinations</span>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by pet or vaccine"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-600 placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(e.target.value)}
              className="pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="ALL">All vaccinations</option>
              <option value="30">Expiring in 30 days</option>
              <option value="60">Expiring in 60 days</option>
              <option value="90">Expiring in 90 days</option>
              <option value="180">Expiring in 180 days</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {isFetching ? 'Refreshing…' : `Showing ${records.length} records`}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No vaccinations found</h3>
          <p className="text-gray-600">Manage vaccinations on each pet record. This page shows upcoming expirations.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((v) => (
            <Card key={v.recordId} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <a href={`/pets/${v.petId}`} className="font-semibold text-gray-900 hover:underline">{v.petName || 'Unknown Pet'}</a>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{v.type || 'Vaccine'}</span>
                      {!isVaccineAppropriate(v.type, v.petSpecies) && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium" title="This vaccine is not typically given to this species">
                          ⚠️ Invalid
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {v.petBreed && <span>{v.petBreed}</span>}
                      {v.petBreed && v.petSpecies && <span className="mx-1">•</span>}
                      {v.petSpecies && <span>{v.petSpecies}</span>}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      Expires: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'N/A'}
                      {typeof v.daysRemaining === 'number' && (
                        <span className="ml-2 text-gray-500">• {v.daysRemaining} days remaining</span>
                      )}
                    </div>
                    {(v.ownerFirstName || v.ownerLastName || v.ownerEmail) && (
                      <div className="text-sm text-gray-600 mt-1">
                        Owner: {`${v.ownerFirstName || ''} ${v.ownerLastName || ''}`.trim() || 'N/A'}
                        {v.ownerEmail && <span className="ml-2">• {v.ownerEmail}</span>}
                        {v.ownerPhone && <span className="ml-2">• {v.ownerPhone}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.daysRemaining <= 30 && (
                    <div className="text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
                      Expires soon
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteClick(v)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete vaccination"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Manage on the pet record under Vaccinations.
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Vaccination"
        message={`Are you sure you want to delete the ${vaccinationToDelete?.type} vaccination for ${vaccinationToDelete?.petName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Vaccinations;


