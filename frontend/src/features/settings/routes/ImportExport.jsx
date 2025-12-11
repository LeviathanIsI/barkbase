import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
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
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Data' },
  { value: 'pets', label: 'Pets Only' },
  { value: 'owners', label: 'Owners Only' },
  { value: 'bookings', label: 'Bookings Only' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'vaccinations', label: 'Vaccination Records' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV (.csv)', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
];

const ENTITY_ICONS = {
  owners: Users,
  pets: PawPrint,
  bookings: Calendar,
  vaccinations: FileText,
  services: FileText,
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
  const tenant = useTenantStore((state) => state.tenant);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Import wizard state
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [lastImportId, setLastImportId] = useState(null);

  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Filter state for past imports
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [hasErrorsFilter, setHasErrorsFilter] = useState('');

  // Active row menu
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Fetch past imports (HubSpot-style history)
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

  // Handle import complete - redirect to summary
  const handleImportComplete = useCallback((result) => {
    setShowImportWizard(false);
    if (result?.importId) {
      // Navigate to import summary page
      navigate(`/settings/imports/${result.importId}`);
    } else {
      // Fallback to showing success message
      setImportSuccess(`Successfully imported ${result?.newRecords || 0} new, ${result?.updatedRecords || 0} updated`);
      refetchImports();
      setTimeout(() => setImportSuccess(null), 5000);
    }
  }, [navigate, refetchImports]);

  // Handle export
  const handleExport = async () => {
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
          body: JSON.stringify({ scope: exportScope, format: exportFormat }),
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `barkbase_${exportScope}_export.${exportFormat}`;
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
      title="Import & Export"
      description="Move your data in and out of the system"
    >
      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ImportWizard
          onClose={() => setShowImportWizard(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Import Section */}
      <Card
        title="Import Data"
        description="Upload data from external sources using our guided wizard"
      >
        <div className="space-y-4">
          {/* Success message */}
          {importSuccess && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
              <p className="text-sm text-success">{importSuccess}</p>
              {lastImportId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/settings/imports/${lastImportId}`)}
                >
                  View Summary
                </Button>
              )}
            </div>
          )}

          {/* Info panel */}
          <div
            className="rounded-xl p-6 text-center border-2 border-dashed"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              backgroundColor: 'var(--bb-color-bg-elevated)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
            >
              <Upload className="w-6 h-6" style={{ color: 'var(--bb-color-accent)' }} />
            </div>
            <h3 className="text-base font-semibold text-text mb-2">
              Import your data in 4 easy steps
            </h3>
            <p className="text-sm text-muted mb-4 max-w-md mx-auto">
              Our guided wizard will help you select your data type, upload your file,
              map columns to BarkBase fields, and review before importing.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-muted mb-6">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </span>
              <span className="flex items-center gap-1">
                <FileJson className="w-4 h-4" /> JSON
              </span>
            </div>
            <Button onClick={() => setShowImportWizard(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Start Import Wizard
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card
        title="Export Data"
        description="Download your data for backup or migration"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Export Format</label>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Export Scope</label>
              <Select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
              >
                {SCOPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {exportError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{exportError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Past Imports - HubSpot Style */}
      <Card
        header={(
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Past Imports</h3>
              <p className="text-sm text-muted">View and manage your import history</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filters */}
              <Select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-36"
              >
                <option value="">All Types</option>
                <option value="owners">Owners</option>
                <option value="pets">Pets</option>
                <option value="bookings">Bookings</option>
                <option value="vaccinations">Vaccinations</option>
                <option value="services">Services</option>
                <option value="staff">Staff</option>
              </Select>
              <Select
                value={hasErrorsFilter}
                onChange={(e) => setHasErrorsFilter(e.target.value)}
                className="w-36"
              >
                <option value="">All Status</option>
                <option value="false">No Errors</option>
                <option value="true">Has Errors</option>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => refetchImports()} disabled={isLoadingImports}>
                <RefreshCw className={cn("h-4 w-4", isLoadingImports && "animate-spin")} />
              </Button>
            </div>
          </div>
        )}
      >
        {isLoadingImports && imports.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : imports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No imports yet</p>
            <p className="text-xs text-muted mt-1">
              Imports will appear here after you use the import wizard.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted">Entity Types</th>
                  <th className="text-right py-3 px-4 font-medium text-muted">New</th>
                  <th className="text-right py-3 px-4 font-medium text-muted">Updated</th>
                  <th className="text-right py-3 px-4 font-medium text-muted">Errors</th>
                  <th className="text-left py-3 px-4 font-medium text-muted">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted">User</th>
                  <th className="text-right py-3 px-4 font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {imports.map((imp) => (
                  <tr
                    key={imp.id}
                    className="border-b border-border/50 hover:bg-surface/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/settings/imports/${imp.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-info" />
                        <span className="font-medium text-text">{imp.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
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
                    <td className="py-3 px-4 text-right">
                      <span className="text-success font-medium">{imp.newRecords || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-info font-medium">{imp.updatedRecords || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {imp.errorCount > 0 ? (
                        <Badge variant="danger" size="sm">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {imp.errorCount}
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          0
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {formatDate(imp.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {imp.createdByName || '-'}
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
                            <div className="absolute right-0 top-full mt-1 w-48 bg-elevated border border-border rounded-lg shadow-lg z-20">
                              <button
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text hover:bg-surface transition-colors rounded-t-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/settings/imports/${imp.id}`);
                                  setActiveMenuId(null);
                                }}
                              >
                                <Eye className="w-4 h-4 text-muted" />
                                View details
                              </button>
                              {imp.errorCount > 0 && (
                                <button
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text hover:bg-surface transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadErrors(imp.id, imp.name);
                                  }}
                                >
                                  <Download className="w-4 h-4 text-muted" />
                                  Download errors
                                </button>
                              )}
                              <button
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-surface transition-colors rounded-b-lg"
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
      </Card>
    </SettingsPage>
  );
};

// Helper functions

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

export default ImportExport;
