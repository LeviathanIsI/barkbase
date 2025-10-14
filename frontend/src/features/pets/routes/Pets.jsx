import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PawPrint, Plus, FileDown, Settings, ChevronDown, Download, Trash2, RefreshCw, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/cn';
import {
  usePetsQuery,
  useCreatePetMutation,
  useDeletePetMutation,
  useUpdatePetMutation,
} from '../api';
import { PetFormModal } from '../components';

const Pets = () => {
  const navigate = useNavigate();
  const petsQuery = usePetsQuery();
  const pets = useMemo(() => petsQuery.data ?? [], [petsQuery.data]);
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState('all-pets');
  const [activeFilters, setActiveFilters] = useState({});
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const actionsDropdownRef = useRef(null);
  const createPetMutation = useCreatePetMutation();
  const updatePetMutation = useUpdatePetMutation(selectedPet?.recordId);
  const deletePetMutation = useDeletePetMutation();

  useEffect(() => {
    if (petsQuery.isError) {
      toast.error(petsQuery.error?.message ?? 'Unable to load pets', { recordId: 'pets-error' });
    }
  }, [petsQuery.isError, petsQuery.error]);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target)) {
        setShowActionsDropdown(false);
      }
    };

    if (showActionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsDropdown]);

  // Calculate views
  const views = useMemo(() => {
    const activePets = pets.filter((p) => p.status === 'active' || !p.status);
    const inactivePets = pets.filter((p) => p.status === 'inactive');

    return [
      { recordId: 'all-pets', label: 'All Pets' },
      { recordId: 'active', label: 'Active' },
      { recordId: 'inactive', label: 'Inactive' },
      { recordId: 'recent', label: 'Recently Added', canClose: true },
    ];
  }, [pets]);

  // Filter groups for the filter bar
  const filterGroups = [
    { recordId: 'owner',
      label: 'Pet Owner',
      options: [
        ...Array.from(new Set(pets.flatMap(p => p.owners || []).map(o => o.name || o.email)))
          .filter(Boolean)
          .sort()
          .map(name => ({ value: name, label: name }))
      ],
    },
    { recordId: 'breed',
      label: 'Breed',
      options: [
        ...Array.from(new Set(pets.map(p => p.breed).filter(Boolean)))
          .sort()
          .map(breed => ({ value: breed, label: breed }))
      ],
    },
    { recordId: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { recordId: 'bookings',
      label: 'Booking Count',
      options: [
        { value: 'zero', label: '0 bookings' },
        { value: '1-5', label: '1-5 bookings' },
        { value: '6-10', label: '6-10 bookings' },
        { value: '11-20', label: '11-20 bookings' },
        { value: '21+', label: '21+ bookings' },
      ],
    },
  ];

  // Filter data based on active view and filters
  const filteredPets = useMemo(() => {
    let result = pets;

    // Apply view filter
    if (activeView === 'active') {
      result = result.filter((p) => p.status === 'active' || !p.status);
    } else if (activeView === 'inactive') {
      result = result.filter((p) => p.status === 'inactive');
    } else if (activeView === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((p) => new Date(p.createdAt || 0) >= thirtyDaysAgo);
    }

    // Apply active filters
    if (activeFilters.owner) {
      result = result.filter((p) => {
        const ownerNames = (p.owners || []).map(o => o.name || o.email);
        return ownerNames.includes(activeFilters.owner);
      });
    }

    if (activeFilters.breed) {
      result = result.filter((p) => p.breed === activeFilters.breed);
    }

    if (activeFilters.status) {
      result = result.filter((p) => (p.status || 'active') === activeFilters.status);
    }

    if (activeFilters.bookings) {
      result = result.filter((p) => {
        const count = p.bookings?.length || 0;
        switch (activeFilters.bookings) {
          case 'zero':
            return count === 0;
          case '1-5':
            return count >= 1 && count <= 5;
          case '6-10':
            return count >= 6 && count <= 10;
          case '11-20':
            return count >= 11 && count <= 20;
          case '21+':
            return count >= 21;
          default:
            return true;
        }
      });
    }

    return result;
  }, [pets, activeView, activeFilters]);

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <PawPrint className="h-4 w-4" />
          </div>
          <div>
            <button className="font-medium text-blue-600 hover:underline">
              {row.name}
            </button>
            <p className="text-xs text-gray-500">{row.breed || 'Unknown breed'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Breed',
      accessor: 'breed',
      sortable: true,
      cell: (row) => <span className="text-gray-700">{row.breed || '--'}</span>,
    },
    {
      header: 'Owners',
      accessor: 'owners',
      cell: (row) => {
        const owners = row.owners || [];
        if (owners.length === 0) return <span className="text-gray-500">--</span>;
        return (
          <div className="flex flex-col gap-0.5">
            {owners.slice(0, 2).map((owner) => (
              <button
                key={owner.recordId}
                className="text-left text-sm text-blue-600 hover:underline"
              >
                {owner.name || owner.email}
              </button>
            ))}
            {owners.length > 2 && (
              <span className="text-xs text-gray-500">+{owners.length - 2} more</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Medical Notes',
      accessor: 'medicalNotes',
      cell: (row) => {
        const notes = row.medicalNotes || '';
        if (!notes) return <span className="text-gray-500">--</span>;
        if (notes.length > 50) {
          return (
            <button className="text-left text-sm text-blue-600 hover:underline">
              {notes.substring(0, 50)}...
            </button>
          );
        }
        return <span className="text-sm text-gray-700">{notes}</span>;
      },
    },
    {
      header: 'Dietary Notes',
      accessor: 'dietaryNotes',
      cell: (row) => {
        const notes = row.dietaryNotes || '';
        if (!notes) return <span className="text-gray-500">--</span>;
        if (notes.length > 50) {
          return (
            <button className="text-left text-sm text-blue-600 hover:underline">
              {notes.substring(0, 50)}...
            </button>
          );
        }
        return <span className="text-sm text-gray-700">{notes}</span>;
      },
    },
    {
      header: 'Bookings',
      accessor: 'bookingCount',
      sortable: true,
      cell: (row) => {
        const count = row.bookings?.length || 0;
        const lastBooking = row.bookings?.[0];
        return (
          <div>
            <button className="font-medium text-blue-600 hover:underline">
              {count} {count === 1 ? 'record' : 'records'}
            </button>
            {lastBooking && (
              <p className="text-xs text-gray-500">
                Last: {new Date(lastBooking.checkIn).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      cell: (row) => {
        const status = row.status || 'active';
        const statusStyles = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusStyles[status])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ];

  const handleRowClick = (pet) => {
    navigate(`/pets/${pet.recordId}`);
  };

  const handleFilterChange = (filterId, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const handleFilterClear = (filterId) => {
    setActiveFilters((prev) => {
      const updated = { ...prev };
      delete updated[filterId];
      return updated;
    });
  };

  const handleExport = () => {
    // Export visible data to CSV
    const headers = columns.map(col => col.header);
    const rows = filteredPets.map(pet =>
      columns.map(col => {
        const value = pet[col.accessor];
        if (col.accessor === 'owners') {
          const owners = pet.owners || [];
          return owners.map(o => o.name || o.email).join('; ');
        }
        if (col.accessor === 'bookingCount') {
          return pet.bookings?.length || 0;
        }
        return value || '';
      })
    );

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pets-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Pets exported successfully');
  };

  const handleExportAll = () => {
    // Export all pets to CSV
    const headers = columns.map(col => col.header);
    const rows = pets.map(pet =>
      columns.map(col => {
        const value = pet[col.accessor];
        if (col.accessor === 'owners') {
          const owners = pet.owners || [];
          return owners.map(o => o.name || o.email).join('; ');
        }
        if (col.accessor === 'bookingCount') {
          return pet.bookings?.length || 0;
        }
        return value || '';
      })
    );

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `all-pets-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('All pets exported successfully');
    setShowActionsDropdown(false);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
    toast.success('Pets data refreshed');
    setShowActionsDropdown(false);
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all pets? This action cannot be undone.')) {
      toast.error('Bulk delete not yet implemented');
    }
    setShowActionsDropdown(false);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      const petsToCreate = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const pet = {};
        headers.forEach((header, idx) => {
          const value = values[idx];
          switch (header.toLowerCase()) {
            case 'name':
              pet.name = value;
              break;
            case 'breed':
              pet.breed = value;
              break;
            case 'status':
              pet.status = value;
              break;
            case 'medical notes':
            case 'medicalnotes':
              pet.medicalNotes = value;
              break;
            case 'dietary notes':
            case 'dietarynotes':
              pet.dietaryNotes = value;
              break;
          }
        });
        return pet;
      });

      try {
        for (const pet of petsToCreate) {
          if (pet.name) {
            await createPetMutation.mutateAsync(pet);
          }
        }
        toast.success(`Successfully imported ${petsToCreate.length} pets`);
        setImportModalOpen(false);
      } catch (error) {
        toast.error(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCreatePet = () => {
    setSelectedPet(null);
    setPetFormModalOpen(true);
  };

  const handlePetFormSubmit = async (data) => {
    try {
      if (selectedPet) {
        await updatePetMutation.mutateAsync(data);
        toast.success('Pet updated successfully');
      } else {
        // Add required fields for pet creation - only send fields that have values
        const petData = {
          name: data.name,
          ownerIds: [], // Empty array - owners can be assigned later
          behaviorFlags: [], // Empty array for behavior flags
        };

        // Only add optional fields if they have values
        if (data.breed) petData.breed = data.breed;
        if (data.birthdate) petData.birthdate = data.birthdate;
        if (data.medicalNotes) petData.medicalNotes = data.medicalNotes;
        if (data.dietaryNotes) petData.dietaryNotes = data.dietaryNotes;
        if (data.status) petData.status = data.status;

        console.log('Sending pet data:', petData);
        await createPetMutation.mutateAsync(petData);
        toast.success('Pet created successfully');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
      setPetFormModalOpen(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Pet creation error:', error);
      toast.error(error?.message || 'Failed to save pet');
    }
  };

  if (petsQuery.isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <DataTable
        title="Pets"
        recordCount={pets.length}
        columns={columns}
        data={filteredPets}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        searchPlaceholder="Search name, breed, owner, notes..."
        onRowClick={handleRowClick}
        enableSelection
        onExport={handleExport}
        headerActions={
          <>
            <div ref={actionsDropdownRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              >
                Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {showActionsDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-white shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={handleExportAll}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4" />
                      Export all
                    </button>
                    <button
                      onClick={handleRefresh}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh data
                    </button>
                    <button
                      onClick={handleDeleteAll}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete all
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
              Import
            </Button>
            <Button size="sm" onClick={handleCreatePet}>
              <Plus className="h-4 w-4 mr-2" />
              New Pet
            </Button>
          </>
        }
      />

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Import Pets</h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-600">
                Upload a CSV file with the following columns:
              </p>
              <ul className="mb-4 list-disc pl-5 text-sm text-gray-600">
                <li>Name (required)</li>
                <li>Breed</li>
                <li>Status (active/inactive)</li>
                <li>Medical Notes</li>
                <li>Dietary Notes</li>
              </ul>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Form Modal */}
      <PetFormModal
        open={petFormModalOpen}
        onClose={() => {
          setPetFormModalOpen(false);
          setSelectedPet(null);
        }}
        onSubmit={handlePetFormSubmit}
        pet={selectedPet}
        isLoading={createPetMutation.isPending || updatePetMutation.isPending}
      />
    </>
  );
};

export default Pets;
