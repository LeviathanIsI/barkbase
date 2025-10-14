import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Users as UsersIcon, Mail, Phone, Plus, Calendar, Settings, ChevronDown, Download, Trash2, RefreshCw } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import {
  useOwnersQuery,
  useCreateOwnerMutation,
  useUpdateOwnerMutation,
  useDeleteOwnerMutation,
} from '../api';
import OwnerFormModal from '../components/OwnerFormModal';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const Owners = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('all-owners');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const actionsDropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const ownersQuery = useOwnersQuery();
  const owners = useMemo(() => ownersQuery.data?.data ?? [], [ownersQuery.data]);

  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const queryClient = useQueryClient();

  const createOwnerMutation = useCreateOwnerMutation();
  const updateOwnerMutation = useUpdateOwnerMutation(editingOwner?.recordId);
  const deleteOwnerMutation = useDeleteOwnerMutation();

  useEffect(() => {
    if (ownersQuery.isError) {
      toast.error(ownersQuery.error?.message ?? 'Unable to load owners', { recordId: 'owners-error' });
    }
  }, [ownersQuery.isError, ownersQuery.error]);

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

  // Views
  const views = useMemo(() => [
    { recordId: 'all-owners', label: 'All Owners' },
    { recordId: 'active', label: 'Active Clients' },
    { recordId: 'inactive', label: 'Inactive' },
    { recordId: 'high-value', label: 'High Value Clients', canClose: true },
  ], []);

  // Filter groups for the filter bar
  const filterGroups = [
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
    { recordId: 'joinDate',
      label: 'Create Date',
      options: [
        { value: 'last7days', label: 'Last 7 days' },
        { value: 'last30days', label: 'Last 30 days' },
        { value: 'last90days', label: 'Last 90 days' },
        { value: 'thisYear', label: 'This year' },
        { value: 'lastYear', label: 'Last year' },
      ],
    },
    { recordId: 'lastBooking',
      label: 'Last Booking',
      options: [
        { value: 'last7days', label: 'Last 7 days' },
        { value: 'last30days', label: 'Last 30 days' },
        { value: 'last90days', label: 'Last 90 days' },
        { value: 'thisYear', label: 'This year' },
        { value: 'never', label: 'Never booked' },
      ],
    },
    { recordId: 'lifetime',
      label: 'Lifetime Value',
      options: [
        { value: '0-500', label: '$0 - $500' },
        { value: '500-1000', label: '$500 - $1,000' },
        { value: '1000-5000', label: '$1,000 - $5,000' },
        { value: '5000-10000', label: '$5,000 - $10,000' },
        { value: '10000+', label: '$10,000+' },
      ],
    },
  ];

  // Calculate lifetime value from bookings/payments
  const ownersWithMetrics = useMemo(() => {
    return owners.map((owner) => {
      const bookings = owner.bookings || [];
      const payments = owner.payments || [];
      const totalBookings = bookings.length;

      // Calculate lifetime value from payments
      const lifetimeValue = payments.reduce((sum, payment) => {
        return sum + (payment.amountCents || 0);
      }, 0) / 100; // Convert cents to dollars

      // Get last booking date
      const lastBooking = bookings.length > 0
        ? bookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0].checkIn
        : null;

      // Get pets array (already transformed by backend)
      const pets = owner.pets || [];

      return {
        ...owner,
        totalBookings,
        lifetimeValue,
        lastBooking,
        pets,
        name: `${owner.firstName} ${owner.lastName}`,
      };
    });
  }, [owners]);

  // Filter data based on active view and filters
  const filteredOwners = useMemo(() => {
    let filtered = ownersWithMetrics;

    // Apply view filter
    if (activeView === 'active') {
      filtered = filtered.filter((o) => o.totalBookings > 0);
    } else if (activeView === 'inactive') {
      filtered = filtered.filter((o) => o.totalBookings === 0);
    } else if (activeView === 'high-value') {
      filtered = filtered.filter((o) => o.lifetimeValue >= 5000);
    }

    // Apply active filters
    Object.entries(activeFilters).forEach(([filterId, filterValue]) => {
      if (!filterValue) return;

      if (filterId === 'bookings') {
        if (filterValue === 'zero') {
          filtered = filtered.filter((o) => o.totalBookings === 0);
        } else if (filterValue === '1-5') {
          filtered = filtered.filter((o) => o.totalBookings >= 1 && o.totalBookings <= 5);
        } else if (filterValue === '6-10') {
          filtered = filtered.filter((o) => o.totalBookings >= 6 && o.totalBookings <= 10);
        } else if (filterValue === '11-20') {
          filtered = filtered.filter((o) => o.totalBookings >= 11 && o.totalBookings <= 20);
        } else if (filterValue === '21+') {
          filtered = filtered.filter((o) => o.totalBookings >= 21);
        }
      }

      if (filterId === 'joinDate') {
        const now = new Date();
        const createdAt = (o) => new Date(o.createdAt);

        if (filterValue === 'last7days') {
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((o) => createdAt(o) >= cutoff);
        } else if (filterValue === 'last30days') {
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((o) => createdAt(o) >= cutoff);
        } else if (filterValue === 'last90days') {
          const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter((o) => createdAt(o) >= cutoff);
        } else if (filterValue === 'thisYear') {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          filtered = filtered.filter((o) => createdAt(o) >= startOfYear);
        } else if (filterValue === 'lastYear') {
          const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
          const endOfLastYear = new Date(now.getFullYear(), 0, 1);
          filtered = filtered.filter((o) => createdAt(o) >= startOfLastYear && createdAt(o) < endOfLastYear);
        }
      }

      if (filterId === 'lastBooking') {
        const now = new Date();

        if (filterValue === 'never') {
          filtered = filtered.filter((o) => !o.lastBooking);
        } else {
          const lastBookingDate = (o) => o.lastBooking ? new Date(o.lastBooking) : null;

          if (filterValue === 'last7days') {
            const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((o) => lastBookingDate(o) && lastBookingDate(o) >= cutoff);
          } else if (filterValue === 'last30days') {
            const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((o) => lastBookingDate(o) && lastBookingDate(o) >= cutoff);
          } else if (filterValue === 'last90days') {
            const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((o) => lastBookingDate(o) && lastBookingDate(o) >= cutoff);
          } else if (filterValue === 'thisYear') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            filtered = filtered.filter((o) => lastBookingDate(o) && lastBookingDate(o) >= startOfYear);
          }
        }
      }

      if (filterId === 'lifetime') {
        if (filterValue === '0-500') {
          filtered = filtered.filter((o) => o.lifetimeValue >= 0 && o.lifetimeValue < 500);
        } else if (filterValue === '500-1000') {
          filtered = filtered.filter((o) => o.lifetimeValue >= 500 && o.lifetimeValue < 1000);
        } else if (filterValue === '1000-5000') {
          filtered = filtered.filter((o) => o.lifetimeValue >= 1000 && o.lifetimeValue < 5000);
        } else if (filterValue === '5000-10000') {
          filtered = filtered.filter((o) => o.lifetimeValue >= 5000 && o.lifetimeValue < 10000);
        } else if (filterValue === '10000+') {
          filtered = filtered.filter((o) => o.lifetimeValue >= 10000);
        }
      }
    });

    return filtered;
  }, [ownersWithMetrics, activeView, activeFilters]);

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <UsersIcon className="h-4 w-4" />
          </div>
          <div>
            <button className="font-medium text-blue-600 hover:underline">
              {row.name}
            </button>
            {row.email && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Mail className="h-3 w-3" />
                {row.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      accessor: 'phone',
      cell: (row) => {
        if (!row.phone) return <span className="text-gray-500">--</span>;
        return (
          <button className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <Phone className="h-3.5 w-3.5" />
            {row.phone}
          </button>
        );
      },
    },
    {
      header: 'Pets',
      accessor: 'pets',
      cell: (row) => {
        const pets = row.pets || [];
        if (pets.length === 0) return <span className="text-gray-500">--</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {pets.map((pet, idx) => (
              <button
                key={idx}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                {pet.name}
              </button>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Total Bookings',
      accessor: 'totalBookings',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.totalBookings}</p>
          {row.lastBooking && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {new Date(row.lastBooking).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Lifetime Value',
      accessor: 'lifetimeValue',
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(row.lifetimeValue)}
        </span>
      ),
    },
    {
      header: 'Create Date',
      accessor: 'createdAt',
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-gray-700">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const handleRowClick = (owner) => {
    navigate(`/customers/${owner.recordId}`);
  };

  const handleExport = () => {
    toast.success('Export feature coming soon!');
  };

  const handleCreateOwner = () => {
    setEditingOwner(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingOwner) {
        await updateOwnerMutation.mutateAsync(data);
        toast.success('Owner updated successfully');
      } else {
        await createOwnerMutation.mutateAsync(data);
        toast.success('Owner created successfully');
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
      setFormModalOpen(false);
      setEditingOwner(null);
    } catch (error) {
      toast.error(error.message ?? 'Failed to save owner');
    }
  };

  const handleFilterChange = (filterId, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const handleFilterClear = (filterId) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[filterId];
      return newFilters;
    });
  };

  const handleBulkExport = () => {
    setShowActionsDropdown(false);

    // Export all filtered owners as CSV
    const headers = ['Name', 'Email', 'Phone', 'Total Bookings', 'Lifetime Value', 'Last Booking', 'Join Date'];
    const rows = filteredOwners.map((owner) => [
      owner.name,
      owner.email || '',
      owner.phone || '',
      owner.totalBookings,
      owner.lifetimeValue,
      owner.lastBooking ? new Date(owner.lastBooking).toLocaleDateString() : '',
      new Date(owner.createdAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `owners-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredOwners.length} owners`);
  };

  const handleRefreshData = () => {
    setShowActionsDropdown(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
    toast.success('Data refreshed');
  };

  const handleBulkDelete = () => {
    setShowActionsDropdown(false);
    toast.error('Bulk delete is not yet implemented');
  };

  const handleImportClick = () => {
    setImportModalOpen(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportFile(file);

    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      // Expected headers: firstName, lastName, email, phone, address, city, state, zipCode
      const requiredHeaders = ['firstname', 'lastname'];
      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      // Parse rows
      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return row;
      });

      setImportPreview(preview);
      toast.success(`CSV loaded: ${lines.length - 1} rows found`);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);

    try {
      // Parse full CSV
      const text = await importFile.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return row;
      });

      // Import each row
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const ownerData = {
            firstName: row.firstname || row.first_name || '',
            lastName: row.lastname || row.last_name || '',
            email: row.email || '',
            phone: row.phone || '',
            address: row.address || '',
            city: row.city || '',
            state: row.state || '',
            zipCode: row.zipcode || row.zip_code || row.zip || '',
          };

          if (!ownerData.firstName || !ownerData.lastName) {
            errorCount++;
            continue;
          }

          await createOwnerMutation.mutateAsync(ownerData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Failed to import row:', row, error);
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });

      toast.success(`Import complete: ${successCount} owners imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`);

      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (error) {
      toast.error('Import failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  if (ownersQuery.isLoading) {
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
        title="Owners"
        recordCount={owners.length}
        columns={columns}
        data={filteredOwners}
        views={views}
        activeView={activeView}
        onViewChange={setActiveView}
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onFilterClear={handleFilterClear}
        searchPlaceholder="Search name, email, phone, pets..."
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
                <ChevronDown className={cn('h-3 w-3 ml-2 transition-transform', showActionsDropdown && 'rotate-180')} />
              </Button>

              {showActionsDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-white shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={handleBulkExport}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 text-gray-500" />
                      <span>Export all</span>
                    </button>
                    <button
                      onClick={handleRefreshData}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4 text-gray-500" />
                      <span>Refresh data</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={handleBulkDelete}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete all (filtered)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleImportClick}>
              Import
            </Button>
            <Button size="sm" onClick={handleCreateOwner}>
              <Plus className="h-4 w-4 mr-2" />
              Create Owner
            </Button>
          </>
        }
      />

      <OwnerFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingOwner(null);
        }}
        onSubmit={handleFormSubmit}
        owner={editingOwner}
        isLoading={createOwnerMutation.isPending || updateOwnerMutation.isPending}
      />

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-text">Import Owners from CSV</h2>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-muted">
                  Upload a CSV file with the following columns:
                </p>
                <code className="block rounded bg-gray-100 p-2 text-xs">
                  firstName, lastName, email, phone, address, city, state, zipCode
                </code>
                <p className="mt-2 text-xs text-muted">
                  Note: firstName and lastName are required.
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  {importFile ? importFile.name : 'Choose CSV File'}
                </Button>
              </div>

              {importPreview.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-text">Preview (first 5 rows):</h3>
                  <div className="max-h-64 overflow-auto rounded border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left">First Name</th>
                          <th className="px-2 py-1 text-left">Last Name</th>
                          <th className="px-2 py-1 text-left">Email</th>
                          <th className="px-2 py-1 text-left">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">{row.firstname || row.first_name}</td>
                            <td className="px-2 py-1">{row.lastname || row.last_name}</td>
                            <td className="px-2 py-1">{row.email}</td>
                            <td className="px-2 py-1">{row.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Owners;
