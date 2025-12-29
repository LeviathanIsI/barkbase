/**
 * Incident List Component
 * Displays a list of incidents with filtering and actions
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Clock, CheckCircle, Filter, Plus, Eye, Trash2, Bell } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { getIncidents, deleteIncident, resolveIncident, notifyOwnerOfIncident } from '../api';
import { cn } from '@/lib/cn';

const SEVERITY_CONFIG = {
  LOW: { color: 'text-blue-500', bg: 'bg-blue-100', icon: Info },
  MEDIUM: { color: 'text-yellow-500', bg: 'bg-yellow-100', icon: AlertCircle },
  HIGH: { color: 'text-orange-500', bg: 'bg-orange-100', icon: AlertTriangle },
  CRITICAL: { color: 'text-red-500', bg: 'bg-red-100', icon: AlertTriangle },
};

const STATUS_CONFIG = {
  OPEN: { color: 'text-red-600', bg: 'bg-red-100' },
  INVESTIGATING: { color: 'text-yellow-600', bg: 'bg-yellow-100' },
  RESOLVED: { color: 'text-green-600', bg: 'bg-green-100' },
  CLOSED: { color: 'text-gray-600', bg: 'bg-gray-100' },
};

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury' },
  { value: 'illness', label: 'Illness' },
  { value: 'escape', label: 'Escape Attempt' },
  { value: 'bite', label: 'Bite' },
  { value: 'fight', label: 'Fight' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'behavior', label: 'Behavior Issue' },
  { value: 'other', label: 'Other' },
];

export default function IncidentList({ onCreateNew, onViewIncident, onRefresh }) {
  const tz = useTimezoneUtils();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return tz.formatDate(dateString, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    type: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getIncidents(filters);
      // apiClient.get returns { data: backendResponse }
      // Backend returns { data: [...], incidents: [...], total: ... }
      const backendData = response.data || {};
      setIncidents(backendData.data || backendData.incidents || []);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this incident?')) return;
    
    try {
      await deleteIncident(id);
      fetchIncidents();
    } catch (err) {
      console.error('Failed to delete incident:', err);
      alert('Failed to delete incident');
    }
  };

  const handleResolve = async (id, e) => {
    e.stopPropagation();
    const notes = prompt('Enter resolution notes (optional):');
    
    try {
      await resolveIncident(id, { resolutionNotes: notes });
      fetchIncidents();
    } catch (err) {
      console.error('Failed to resolve incident:', err);
      alert('Failed to resolve incident');
    }
  };

  const handleNotifyOwner = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Send incident notification to owner?')) return;
    
    try {
      await notifyOwnerOfIncident(id);
      alert('Owner notified successfully');
      fetchIncidents();
    } catch (err) {
      console.error('Failed to notify owner:', err);
      alert('Failed to notify owner');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Incident Reports
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-secondary)' }}>
                Status
              </label>
              <StyledSelect
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'OPEN', label: 'Open' },
                  { value: 'INVESTIGATING', label: 'Investigating' },
                  { value: 'RESOLVED', label: 'Resolved' },
                  { value: 'CLOSED', label: 'Closed' },
                ]}
                value={filters.status}
                onChange={(opt) => setFilters({ ...filters, status: opt?.value || '' })}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-secondary)' }}>
                Severity
              </label>
              <StyledSelect
                options={[
                  { value: '', label: 'All Severities' },
                  { value: 'LOW', label: 'Low' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'HIGH', label: 'High' },
                  { value: 'CRITICAL', label: 'Critical' },
                ]}
                value={filters.severity}
                onChange={(opt) => setFilters({ ...filters, severity: opt?.value || '' })}
                isClearable={false}
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-secondary)' }}>
                Type
              </label>
              <StyledSelect
                options={[
                  { value: '', label: 'All Types' },
                  ...INCIDENT_TYPES.map((type) => ({ value: type.value, label: type.label }))
                ]}
                value={filters.type}
                onChange={(opt) => setFilters({ ...filters, type: opt?.value || '' })}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!error && incidents.length === 0 && (
        <div
          className="p-8 text-center rounded-lg border"
          style={{
            backgroundColor: 'var(--bb-color-bg-surface)',
            borderColor: 'var(--bb-color-border-subtle)',
          }}
        >
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
            No incidents found
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
            {Object.values(filters).some(Boolean)
              ? 'No incidents match your current filters.'
              : 'No incidents have been reported yet.'}
          </p>
          {Object.values(filters).some(Boolean) && (
            <Button
              variant="ghost"
              onClick={() => setFilters({ status: '', severity: '', type: '' })}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Incident List */}
      {incidents.length > 0 && (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const SeverityIcon = SEVERITY_CONFIG[incident.severity]?.icon || Info;
            const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.LOW;
            const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.OPEN;

            return (
              <div
                key={incident.id}
                className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
                onClick={() => onViewIncident?.(incident)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn('p-2 rounded-lg', severityConfig.bg)}>
                      <SeverityIcon className={cn('h-5 w-5', severityConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
                          {incident.title}
                        </h3>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.bg, statusConfig.color)}>
                          {incident.status}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severityConfig.bg, severityConfig.color)}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--bb-color-text-secondary)' }}>
                        {incident.description || 'No description provided'}
                      </p>
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {incident.petName && (
                          <span>Pet: {incident.petName}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(incident.incidentDate)}
                        </span>
                        {incident.incidentType && (
                          <span className="capitalize">{incident.incidentType.replace('_', ' ')}</span>
                        )}
                        {incident.ownerNotified && (
                          <span className="text-green-600 flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            Owner notified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewIncident?.(incident);
                      }}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!incident.ownerNotified && incident.ownerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleNotifyOwner(incident.id, e)}
                        title="Notify Owner"
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    )}
                    {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleResolve(incident.id, e)}
                        title="Resolve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(incident.id, e)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

