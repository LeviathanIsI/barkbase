import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import SettingsPage from '../components/SettingsPage';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  ArrowLeft,
  Download,
  Eye,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Users,
  PawPrint,
  Calendar,
  ChevronDown,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/cn';

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

const ERROR_TYPE_LABELS = {
  required_field_missing: 'Required field missing',
  invalid_email_format: 'Invalid email format',
  record_not_found: 'Record not found',
  association_not_found: 'Association not found',
  duplicate_identifier: 'Duplicate identifier',
  invalid_date_format: 'Invalid date format',
  database_error: 'Database error',
  not_supported: 'Not supported',
  unknown_entity: 'Unknown entity',
  system_error: 'System error',
  import_error: 'Import error',
};

const ImportSummary = () => {
  const { importId } = useParams();
  const navigate = useNavigate();
  const [showMappingDetails, setShowMappingDetails] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);

  // Fetch import details
  const { data: importData, isLoading, error } = useQuery({
    queryKey: ['import', importId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/imports/${importId}`);
      return data;
    },
    enabled: !!importId,
  });

  // Handle download errors
  const handleDownloadErrors = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/imports/${importId}/errors`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importData?.name || 'import'}_errors.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download errors failed:', err);
    }
  }, [importId, importData?.name]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get status badge props
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { variant: 'success', icon: CheckCircle, label: 'Completed' };
      case 'completed_with_errors':
        return { variant: 'warning', icon: AlertCircle, label: 'Completed with errors' };
      case 'failed':
        return { variant: 'danger', icon: AlertCircle, label: 'Failed' };
      case 'processing':
        return { variant: 'info', icon: Clock, label: 'Processing' };
      default:
        return { variant: 'neutral', icon: Clock, label: status };
    }
  };

  // Get ready indicator color
  const getReadyIndicator = () => {
    if (!importData) return 'bg-muted';
    if (importData.errorCount > 0) return 'bg-warning';
    if (importData.status === 'failed') return 'bg-danger';
    return 'bg-success';
  };

  if (isLoading) {
    return (
      <SettingsPage title="Import Summary" description="Loading import details...">
        <div className="flex items-center justify-center py-12">
          <Clock className="w-8 h-8 animate-spin text-muted" />
        </div>
      </SettingsPage>
    );
  }

  if (error || !importData) {
    return (
      <SettingsPage title="Import Summary" description="Import not found">
        <Card>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <p className="text-text font-medium">Import not found</p>
            <p className="text-sm text-muted mt-1">
              This import may have been deleted or does not exist.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/settings/import-export')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Import & Export
            </Button>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const statusBadge = getStatusBadge(importData.status);
  const StatusIcon = statusBadge.icon;

  return (
    <SettingsPage
      title={importData.name}
      description={
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={statusBadge.variant}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusBadge.label}
          </Badge>
          <span className="text-muted">|</span>
          <span className="text-sm text-muted">{importData.importType}</span>
          <span className="text-muted">|</span>
          <span className="text-sm text-muted">
            {formatDate(importData.completedAt || importData.createdAt)}
          </span>
          {importData.createdBy?.name && (
            <>
              <span className="text-muted">|</span>
              <span className="text-sm text-muted">by {importData.createdBy.name}</span>
            </>
          )}
        </div>
      }
      backLink="/settings/import-export"
      backLabel="Import & Export"
    >
      {/* Summary Card */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
          {/* Import Rows */}
          <div className="text-center">
            <p className="text-3xl font-bold text-text">{importData.totalRows || 0}</p>
            <p className="text-sm text-muted mt-1">Import Rows</p>
          </div>
          {/* New Records */}
          <div className="text-center">
            <p className="text-3xl font-bold text-success">{importData.newRecords || 0}</p>
            <p className="text-sm text-muted mt-1">New Records</p>
          </div>
          {/* Updated Records */}
          <div className="text-center">
            <p className="text-3xl font-bold text-info">{importData.updatedRecords || 0}</p>
            <p className="text-sm text-muted mt-1">Updated Records</p>
          </div>
          {/* New Associations */}
          <div className="text-center">
            <p className="text-3xl font-bold text-accent">{importData.newAssociations || 0}</p>
            <p className="text-sm text-muted mt-1">New Associations</p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* View Imported Records Dropdown */}
        <div className="relative">
          <Button
            variant="secondary"
            onClick={() => setShowViewMenu(!showViewMenu)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View imported records
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          {showViewMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowViewMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-48 bg-elevated border border-border rounded-lg shadow-lg z-20">
                {importData.entityTypes?.map((type) => {
                  const Icon = ENTITY_ICONS[type] || FileText;
                  const label = ENTITY_LABELS[type] || type;
                  const path = type === 'owners' ? '/owners' : type === 'pets' ? '/pets' : `/${type}`;
                  return (
                    <Link
                      key={type}
                      to={path}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface transition-colors first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => setShowViewMenu(false)}
                    >
                      <Icon className="w-4 h-4 text-muted" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Actions Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setShowActionsMenu(!showActionsMenu)}
          >
            <MoreHorizontal className="w-4 h-4 mr-2" />
            Actions
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          {showActionsMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActionsMenu(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-56 bg-elevated border border-border rounded-lg shadow-lg z-20">
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text hover:bg-surface transition-colors rounded-t-lg"
                  onClick={() => {
                    // Download original file - would need to implement file storage
                    setShowActionsMenu(false);
                  }}
                  disabled
                >
                  <Download className="w-4 h-4 text-muted" />
                  Download original file
                </button>
                <button
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text hover:bg-surface transition-colors rounded-b-lg"
                  onClick={() => {
                    // Use as template
                    navigate('/settings/import-export');
                    setShowActionsMenu(false);
                  }}
                >
                  <Upload className="w-4 h-4 text-muted" />
                  Use as template for new import
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mapping Review (Collapsible) */}
      <Card>
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setShowMappingDetails(!showMappingDetails)}
        >
          <div>
            <h3 className="font-semibold text-text">Mapping Review</h3>
            <p className="text-sm text-muted">
              {Object.keys(importData.mappings || {}).length} columns mapped
            </p>
          </div>
          {showMappingDetails ? (
            <ChevronDown className="w-5 h-5 text-muted" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted" />
          )}
        </button>

        {showMappingDetails && (
          <div className="border-t border-border p-4">
            {Object.keys(importData.mappings || {}).length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No mapping data available</p>
            ) : (
              <div className="space-y-4">
                {importData.entityTypes?.map((entityType) => (
                  <div key={entityType}>
                    <h4 className="text-sm font-medium text-text mb-2 capitalize">
                      {ENTITY_LABELS[entityType] || entityType}
                    </h4>
                    <div className="bg-surface rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(importData.mappings || {}).map(([csvCol, field]) => (
                          <div key={csvCol} className="flex items-center gap-2">
                            <span className="text-muted">{csvCol}</span>
                            <ChevronRight className="w-3 h-3 text-muted" />
                            <span className="text-text">{field}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Ready Indicator */}
      <Card>
        <div className="flex items-center gap-4 p-4">
          <div className={cn('w-10 h-10 rounded-full flex-shrink-0', getReadyIndicator())} />
          <div>
            <p className="font-medium text-text">
              {importData.status === 'completed' && importData.errorCount === 0
                ? 'Import completed successfully'
                : importData.status === 'completed_with_errors'
                ? `Import completed with ${importData.errorCount} error(s)`
                : importData.status === 'failed'
                ? 'Import failed'
                : 'Import in progress'}
            </p>
            <p className="text-sm text-muted">
              {importData.newRecords} new, {importData.updatedRecords} updated
              {importData.skippedRecords > 0 && `, ${importData.skippedRecords} skipped`}
            </p>
          </div>
        </div>
      </Card>

      {/* Import Errors Section */}
      {importData.errorCount > 0 && (
        <Card
          title={`Import Errors (${importData.errorCount})`}
          description="Rows that could not be imported"
        >
          <div className="space-y-4">
            {/* Error Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={handleDownloadErrors}>
                <Download className="w-4 h-4 mr-2" />
                Download errors as file
              </Button>
            </div>

            {/* Error Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted">Row</th>
                    <th className="text-left py-2 px-3 font-medium text-muted">Column</th>
                    <th className="text-left py-2 px-3 font-medium text-muted">Object Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted">Property</th>
                    <th className="text-left py-2 px-3 font-medium text-muted">Error Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(importData.errors || []).slice(0, 20).map((err, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 px-3 text-text">{err.row || '-'}</td>
                      <td className="py-2 px-3 text-text">{err.column || '-'}</td>
                      <td className="py-2 px-3 text-text capitalize">{err.entityType || '-'}</td>
                      <td className="py-2 px-3 text-text">{err.property || '-'}</td>
                      <td className="py-2 px-3">
                        <Badge variant="danger" size="sm">
                          {ERROR_TYPE_LABELS[err.errorType] || err.errorType || 'Error'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted max-w-[200px] truncate">
                        {err.value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.errors?.length > 20 && (
                <p className="text-xs text-muted text-center py-2">
                  Showing first 20 of {importData.errors.length} errors.
                  Download the full error file to see all.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </SettingsPage>
  );
};

export default ImportSummary;
