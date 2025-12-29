import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { ImportWizard } from '../components/import';
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Users,
  PawPrint,
  Calendar,
  DollarSign,
  Syringe,
  Settings,
  Link2,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Export data types with checkboxes
const EXPORT_ENTITIES = [
  { value: 'owners', label: 'Customers', icon: Users, description: 'Customer contact info and details' },
  { value: 'pets', label: 'Pets', icon: PawPrint, description: 'Pet profiles and medical info' },
  { value: 'bookings', label: 'Bookings', icon: Calendar, description: 'Reservation history' },
  { value: 'invoices', label: 'Invoices', icon: DollarSign, description: 'Financial records' },
  { value: 'vaccinations', label: 'Vaccinations', icon: Syringe, description: 'Vaccination records' },
  { value: 'staff', label: 'Staff', icon: Users, description: 'Team member info' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV (.csv)', description: 'Best for Excel/Sheets' },
  { value: 'xlsx', label: 'Excel (.xlsx)', description: 'Native Excel format' },
  { value: 'json', label: 'JSON (.json)', description: 'For developers' },
];

// Competitor logos/placeholders
const COMPETITOR_IMPORTS = [
  { name: 'Gingr', coming: true },
  { name: 'PetExec', coming: true },
  { name: 'ProPet', coming: true },
  { name: 'Kennel Connection', coming: true },
];

const ENTITY_ICONS = {
  owners: Users,
  pets: PawPrint,
  bookings: Calendar,
  vaccinations: Syringe,
  services: Settings,
  staff: Users,
};

const ENTITY_LABELS = {
  owners: 'Owners',
  pets: 'Pets',
  bookings: 'Bookings',
  vaccinations: 'Vaccinations',
  services: 'Services',
  staff: 'Staff',
};

const ImportExport = () => {
  const navigate = useNavigate();
  const tz = useTimezoneUtils();
  const tenant = useTenantStore((state) => state.tenant);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);

  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedExports, setSelectedExports] = useState(['owners', 'pets', 'bookings', 'invoices']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Filter state for past imports
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [hasErrorsFilter, setHasErrorsFilter] = useState('');

  // Active row menu
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Fetch past imports
  const { data: importsData, isLoading: isLoadingImports, refetch: refetchImports } = useQuery({
    queryKey: ['imports', entityTypeFilter, hasErrorsFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (hasErrorsFilter) params.append('hasErrors', hasErrorsFilter);
      const { data } = await apiClient.get(`/api/v1/imports?${params.toString()}`);
      return data;
    },
  });

  // Handle import complete
  const handleImportComplete = useCallback((result) => {
    setShowImportWizard(false);
    if (result?.importId) {
      navigate(`/settings/imports/${result.importId}`);
    } else {
      setImportSuccess(`Successfully imported ${result?.newRecords || 0} new, ${result?.updatedRecords || 0} updated`);
      refetchImports();
      setTimeout(() => setImportSuccess(null), 5000);
    }
  }, [navigate, refetchImports]);

  // Toggle export selection
  const toggleExportEntity = (value) => {
    setSelectedExports(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  // Handle export
  const handleExport = async () => {
    if (selectedExports.length === 0) {
      setExportError('Please select at least one data type to export');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/import-export/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            'X-Tenant-Id': tenant?.recordId || '',
          },
          body: JSON.stringify({
            entities: selectedExports,
            format: exportFormat
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `barkbase_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle delete import
  const handleDeleteImport = async (importId) => {
    if (!confirm('Are you sure you want to delete this import record?')) return;

    try {
      await apiClient.delete(`/api/v1/imports/${importId}`);
      refetchImports();
    } catch (err) {
      console.error('Delete import failed:', err);
    }
    setActiveMenuId(null);
  };

  // Handle download errors
  const handleDownloadErrors = async (importId, importName) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/imports/${importId}/errors`,
        {
          headers: {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          },
        }
      );
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importName || 'import'}_errors.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download errors failed:', err);
    }
    setActiveMenuId(null);
  };

  const imports = importsData?.imports || [];

  return (
    <SettingsPage
      maxWidth={false}
    >
      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ImportWizard
          onClose={() => setShowImportWizard(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Success message */}
      {importSuccess && (
        <div
          className="rounded-lg p-3 flex items-center gap-2 mb-6"
          style={{
            backgroundColor: 'var(--bb-color-status-positive-soft)',
            border: '1px solid var(--bb-color-status-positive)'
          }}
        >
          <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--bb-color-status-positive)' }} />
          <p className="text-sm" style={{ color: 'var(--bb-color-status-positive)' }}>{importSuccess}</p>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Import */}
        <div className="space-y-6">
          {/* Import Data Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bb-color-info-soft)' }}
              >
                <Upload className="w-5 h-5" style={{ color: 'var(--bb-color-info)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Import Data
                </h3>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Upload from CSV, Excel, or JSON
                </p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className="rounded-xl p-8 text-center border-2 border-dashed cursor-pointer hover:border-[var(--bb-color-accent)] transition-colors"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
                backgroundColor: 'var(--bb-color-bg-elevated)',
              }}
              onClick={() => setShowImportWizard(true)}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
              >
                <Upload className="w-6 h-6" style={{ color: 'var(--bb-color-accent)' }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-primary)' }}>
                Drop files here or click to browse
              </p>
              <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                Supports: CSV, XLSX, JSON
              </p>
            </div>

            <Button
              className="w-full mt-4"
              onClick={() => setShowImportWizard(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Start Import Wizard
            </Button>
          </Card>

          {/* Import from Other Software Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bb-color-purple-soft, var(--bb-color-accent-soft))' }}
              >
                <Link2 className="w-5 h-5" style={{ color: 'var(--bb-color-purple, var(--bb-color-accent))' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Import from Other Software
                </h3>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Easily migrate your existing data
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {COMPETITOR_IMPORTS.map((comp) => (
                <div
                  key={comp.name}
                  className="p-3 rounded-lg border text-center"
                  style={{
                    borderColor: 'var(--bb-color-border-subtle)',
                    backgroundColor: 'var(--bb-color-bg-surface)'
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {comp.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                    Coming soon
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--bb-color-text-muted)' }}>
              Need help migrating? <a href="#" className="underline" style={{ color: 'var(--bb-color-accent)' }}>Contact our team</a> for migration assistance.
            </p>
          </Card>
        </div>

        {/* RIGHT COLUMN - Export */}
        <div className="space-y-6">
          {/* Export Data Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bb-color-status-positive-soft)' }}
              >
                <Download className="w-5 h-5" style={{ color: 'var(--bb-color-status-positive)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Export Data
                </h3>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Download your data for backup or migration
                </p>
              </div>
            </div>

            {/* What to export */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                What to export
              </label>
              <div className="space-y-2">
                {EXPORT_ENTITIES.map((entity) => {
                  const Icon = entity.icon;
                  const isSelected = selectedExports.includes(entity.value);
                  return (
                    <label
                      key={entity.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected
                          ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
                          : "border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-elevated)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleExportEntity(entity.value)}
                        className="w-4 h-4 rounded accent-[var(--bb-color-accent)]"
                      />
                      <Icon className="w-4 h-4" style={{ color: isSelected ? 'var(--bb-color-accent)' : 'var(--bb-color-text-muted)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                          {entity.label}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                Format
              </label>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map((format) => (
                  <label
                    key={format.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      exportFormat === format.value
                        ? "border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
                        : "border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-elevated)]"
                    )}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={() => setExportFormat(format.value)}
                      className="w-4 h-4 accent-[var(--bb-color-accent)]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {format.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {format.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {exportError && (
              <div
                className="rounded-lg p-3 flex items-center gap-2 mb-4"
                style={{
                  backgroundColor: 'var(--bb-color-status-negative-soft)',
                  border: '1px solid var(--bb-color-status-negative)'
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--bb-color-status-negative)' }} />
                <p className="text-sm" style={{ color: 'var(--bb-color-status-negative)' }}>{exportError}</p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleExport}
              disabled={isExporting || selectedExports.length === 0}
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </Card>

          {/* Scheduled Exports Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--bb-color-status-caution-soft)' }}
              >
                <CalendarClock className="w-5 h-5" style={{ color: 'var(--bb-color-status-caution)' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Scheduled Exports
                </h3>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Set up automatic backups
                </p>
              </div>
              <Badge variant="warning" className="ml-auto">Pro</Badge>
            </div>

            <div
              className="p-6 rounded-lg text-center border-2 border-dashed"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                No scheduled exports
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Daily/Weekly/Monthly automatic backups
              </p>
            </div>

            <Button variant="outline" className="w-full mt-4" disabled>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </Card>
        </div>
      </div>

      {/* Import History - Full Width */}
      <Card className="mt-6">
        <div className="p-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                Import History
              </h3>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                View and manage your import history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-36"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'owners', label: 'Owners' },
                  { value: 'pets', label: 'Pets' },
                  { value: 'bookings', label: 'Bookings' },
                  { value: 'vaccinations', label: 'Vaccinations' },
                  { value: 'services', label: 'Services' },
                  { value: 'staff', label: 'Staff' },
                ]}
                menuPortalTarget={document.body}
              />
              <Select
                value={hasErrorsFilter}
                onChange={(e) => setHasErrorsFilter(e.target.value)}
                className="w-36"
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'false', label: 'No Errors' },
                  { value: 'true', label: 'Has Errors' },
                ]}
                menuPortalTarget={document.body}
              />
              <Button variant="ghost" size="sm" onClick={() => refetchImports()} disabled={isLoadingImports}>
                <RefreshCw className={cn("h-4 w-4", isLoadingImports && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {isLoadingImports && imports.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" style={{ color: 'var(--bb-color-text-muted)' }} />
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                No imports yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Imports will appear here after you use the import wizard
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bb-color-border-subtle)' }}>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>Date</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>Type</th>
                    <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>Records</th>
                    <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>Status</th>
                    <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--bb-color-text-muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr
                      key={imp.id}
                      className="hover:bg-[var(--bb-color-bg-elevated)] cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--bb-color-border-subtle)' }}
                      onClick={() => navigate(`/settings/imports/${imp.id}`)}
                    >
                      <td className="py-3 px-4" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {formatDate(imp.createdAt, tz.formatDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {(imp.entityTypes || []).map((type) => {
                            const Icon = ENTITY_ICONS[type] || FileText;
                            return (
                              <Badge key={type} variant="neutral" size="sm">
                                <Icon className="w-3 h-3 mr-1" />
                                {ENTITY_LABELS[type] || type}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {(imp.newRecords || 0) + (imp.updatedRecords || 0)}
                      </td>
                      <td className="py-3 px-4">
                        {imp.errorCount > 0 ? (
                          <Badge variant="danger" size="sm">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {imp.errorCount} errors
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === imp.id ? null : imp.id);
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          {activeMenuId === imp.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                }}
                              />
                              <div
                                className="absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg z-20"
                                style={{
                                  backgroundColor: 'var(--bb-color-bg-elevated)',
                                  borderColor: 'var(--bb-color-border-subtle)'
                                }}
                              >
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[var(--bb-color-bg-surface)] transition-colors rounded-t-lg"
                                  style={{ color: 'var(--bb-color-text-primary)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/settings/imports/${imp.id}`);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <Eye className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                                  View details
                                </button>
                                {imp.errorCount > 0 && (
                                  <button
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[var(--bb-color-bg-surface)] transition-colors"
                                    style={{ color: 'var(--bb-color-text-primary)' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadErrors(imp.id, imp.name);
                                    }}
                                  >
                                    <Download className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                                    Download errors
                                  </button>
                                )}
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-[var(--bb-color-bg-surface)] transition-colors rounded-b-lg"
                                  style={{ color: 'var(--bb-color-status-negative)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImport(imp.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete record
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </SettingsPage>
  );
};

// Helper functions
function formatDate(dateString, tzFormatDate) {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    if (tzFormatDate) {
      return tzFormatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

export default ImportExport;
