/**
 * Incidents Page
 * Redesigned operational page with stats, filters, and sidebar
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle, AlertCircle, Info, Clock, CheckCircle, Filter, Plus, Eye, Trash2, Bell, Search, X, TrendingUp, BarChart3, Zap, PawPrint, Loader2 } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingState from '@/components/ui/LoadingState';
import StyledSelect from '@/components/ui/StyledSelect';
import IncidentForm from '../components/IncidentForm';
import { getIncidents, createIncident, updateIncident, deleteIncident, resolveIncident, notifyOwnerOfIncident } from '../api';
import { getPets } from '@/features/pets/api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Severity configuration
const SEVERITY_CONFIG = {
  LOW: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Low' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Medium' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'High' },
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Critical' },
};

// Status configuration
const STATUS_CONFIG = {
  OPEN: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Open' },
  INVESTIGATING: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Investigating' },
  RESOLVED: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Resolved' },
  CLOSED: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30', label: 'Closed' },
};

// Incident type configuration
const INCIDENT_TYPES = {
  INJURY: { label: 'Injury', color: 'text-red-500' },
  ILLNESS: { label: 'Illness', color: 'text-orange-500' },
  ESCAPE: { label: 'Escape', color: 'text-purple-500' },
  BITE: { label: 'Bite', color: 'text-red-600' },
  FIGHT: { label: 'Fight', color: 'text-amber-600' },
  PROPERTY_DAMAGE: { label: 'Property', color: 'text-blue-500' },
  BEHAVIOR: { label: 'Behavior', color: 'text-indigo-500' },
  OTHER: { label: 'Other', color: 'text-gray-500' },
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, variant = 'primary', tooltip }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className={cn('relative flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}
      title={tooltip}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">{value}</p>
      </div>
    </div>
  );
};

// Inline Status Dropdown
const StatusDropdown = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = STATUS_CONFIG[value] || STATUS_CONFIG.OPEN;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1',
          config.bg,
          config.color,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {config.label}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[120px]">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(key);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                  value === key && 'bg-gray-50 dark:bg-gray-700/50'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', cfg.bg)} />
                {cfg.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Inline Severity Dropdown
const SeverityDropdown = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = SEVERITY_CONFIG[value] || SEVERITY_CONFIG.LOW;

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1',
          config.bg,
          config.color,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {config.label}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[100px]">
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(key);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                  value === key && 'bg-gray-50 dark:bg-gray-700/50'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', cfg.bg)} />
                {cfg.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Incident Summary Sidebar Card
const IncidentSummary = ({ incidents }) => {
  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, INVESTIGATING: 0, RESOLVED: 0, CLOSED: 0 };
    incidents.forEach(i => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return counts;
  }, [incidents]);

  const total = incidents.length;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Incident Summary</h3>
      </div>

      <div className="space-y-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = statusCounts[key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-[color:var(--bb-color-text-muted)] w-20">{cfg.label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                <div
                  className={cn('h-full rounded-full transition-all', cfg.bg.replace('bg-', 'bg-').replace('/30', ''))}
                  style={{ width: `${percentage}%`, backgroundColor: key === 'OPEN' ? '#ef4444' : key === 'INVESTIGATING' ? '#f59e0b' : key === 'RESOLVED' ? '#10b981' : '#6b7280' }}
                />
              </div>
              <span className="text-sm font-bold w-6 text-right text-[color:var(--bb-color-text-primary)]">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// By Severity Sidebar Card
const SeverityBreakdown = ({ incidents }) => {
  const severityCounts = useMemo(() => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, CRITICAL: 0 };
    incidents.forEach(i => {
      if (counts[i.severity] !== undefined) counts[i.severity]++;
    });
    return counts;
  }, [incidents]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Severity</h3>
      </div>

      <div className="space-y-2">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(key => {
          const cfg = SEVERITY_CONFIG[key];
          const count = severityCounts[key] || 0;
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-full', cfg.bg)} />
                <span className="text-sm text-[color:var(--bb-color-text-primary)]">{cfg.label}</span>
              </div>
              <span className={cn('text-sm font-bold', count > 0 ? cfg.color : 'text-[color:var(--bb-color-text-muted)]')}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// By Type Sidebar Card
const TypeBreakdown = ({ incidents }) => {
  const typeCounts = useMemo(() => {
    const counts = {};
    Object.keys(INCIDENT_TYPES).forEach(k => counts[k] = 0);
    incidents.forEach(i => {
      const type = i.incidentType?.toUpperCase() || 'OTHER';
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [incidents]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Type</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(INCIDENT_TYPES).map(([key, cfg]) => {
          const count = typeCounts[key] || 0;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center justify-between px-2 py-1 rounded bg-[color:var(--bb-color-bg-elevated)]">
              <span className={cn('text-xs', cfg.color)}>{cfg.label}</span>
              <span className="text-xs font-bold text-[color:var(--bb-color-text-primary)]">{count}</span>
            </div>
          );
        })}
        {Object.values(typeCounts).every(c => c === 0) && (
          <p className="col-span-2 text-xs text-[color:var(--bb-color-text-muted)] text-center py-2">No incidents yet</p>
        )}
      </div>
    </div>
  );
};

// Quick Report Sidebar Card
const QuickReport = ({ pets, onSubmit, isSubmitting }) => {
  const [form, setForm] = useState({
    petId: '',
    incidentType: 'ILLNESS',
    severity: 'LOW',
    title: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.petId || !form.title.trim()) {
      toast.error('Pet and description are required');
      return;
    }
    onSubmit({
      petIds: [form.petId],
      incidentType: form.incidentType,
      severity: form.severity,
      title: form.title,
      description: form.title,
      incidentDate: new Date().toISOString(),
    });
    setForm({ petId: '', incidentType: 'ILLNESS', severity: 'LOW', title: '' });
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-[color:var(--bb-color-accent-soft)] flex items-center justify-center">
          <Zap className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Quick Report</h3>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Log incident quickly</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1 block">Pet *</label>
          <StyledSelect
            options={[
              { value: '', label: 'Select pet...' },
              ...pets.map(p => ({ value: p.id || p.recordId, label: p.name }))
            ]}
            value={form.petId}
            onChange={(opt) => setForm({ ...form, petId: opt?.value || '' })}
            placeholder="Select pet..."
            isClearable={false}
            isSearchable
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1 block">Type</label>
            <StyledSelect
              options={Object.entries(INCIDENT_TYPES).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
              value={form.incidentType}
              onChange={(opt) => setForm({ ...form, incidentType: opt?.value || 'ILLNESS' })}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1 block">Severity</label>
            <StyledSelect
              options={Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
              value={form.severity}
              onChange={(opt) => setForm({ ...form, severity: opt?.value || 'LOW' })}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1 block">Brief Description *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="What happened?"
            className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
            required
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Reporting...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Report
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

// Incident Card Component
const IncidentCard = ({ incident, onView, onDelete, onResolve, onNotify, onStatusChange, onSeverityChange, onPetClick, isUpdating }) => {
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
  const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.LOW;
  const SeverityIcon = incident.severity === 'HIGH' || incident.severity === 'CRITICAL' ? AlertTriangle : incident.severity === 'MEDIUM' ? AlertCircle : Info;

  return (
    <div
      className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all group"
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
      onClick={() => onView?.(incident)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn('p-2 rounded-lg', severityConfig.bg)}>
            <SeverityIcon className={cn('h-5 w-5', severityConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
                {incident.title}
              </h3>
              <StatusDropdown
                value={incident.status}
                onChange={(newStatus) => onStatusChange(incident.id, newStatus)}
                disabled={isUpdating}
              />
              <SeverityDropdown
                value={incident.severity}
                onChange={(newSeverity) => onSeverityChange(incident.id, newSeverity)}
                disabled={isUpdating}
              />
            </div>
            <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--bb-color-text-secondary)' }}>
              {incident.description || 'No description provided'}
            </p>
            <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--bb-color-text-muted)' }}>
              {incident.petName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPetClick?.(incident.petId);
                  }}
                  className="flex items-center gap-1 hover:text-[color:var(--bb-color-accent)] transition-colors"
                >
                  <PawPrint className="h-3 w-3" />
                  <span className="hover:underline">{incident.petName}</span>
                </button>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(incident.incidentDate)}
              </span>
              {incident.incidentType && (
                <span className={cn('capitalize', INCIDENT_TYPES[incident.incidentType?.toUpperCase()]?.color || 'text-gray-500')}>
                  {incident.incidentType.replace('_', ' ')}
                </span>
              )}
              {incident.ownerNotified && (
                <span className="text-green-600 flex items-center gap-1">
                  <Bell className="h-3 w-3" />
                  Notified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(incident);
            }}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!incident.ownerNotified && incident.ownerId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNotify(incident.id);
              }}
              title="Notify Owner"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
          {incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(incident.id);
              }}
              title="Resolve"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(incident.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function IncidentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    type: '',
    search: '',
  });

  const navigate = useNavigate();

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [incidentsResponse, petsResponse] = await Promise.all([
        getIncidents(),
        getPets(),
      ]);
      const backendData = incidentsResponse.data || {};
      setIncidents(backendData.data || backendData.incidents || []);
      setPets(petsResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const open = incidents.filter(i => i.status === 'OPEN').length;
    const investigating = incidents.filter(i => i.status === 'INVESTIGATING').length;
    const resolvedThisWeek = incidents.filter(i =>
      i.status === 'RESOLVED' && new Date(i.updatedAt || i.incidentDate) >= weekAgo
    ).length;

    return {
      total: incidents.length,
      open,
      investigating,
      resolvedThisWeek,
    };
  }, [incidents]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    let result = incidents;

    if (filters.status) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.severity) {
      result = result.filter(i => i.severity === filters.severity);
    }
    if (filters.type) {
      result = result.filter(i => i.incidentType?.toUpperCase() === filters.type);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term) ||
        i.petName?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [incidents, filters]);

  const handleCreateNew = useCallback(() => {
    setSelectedIncident(null);
    setFormOpen(true);
  }, []);

  const handleViewIncident = useCallback((incident) => {
    setSelectedIncident(incident);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setSelectedIncident(null);
  }, []);

  const handleSubmit = useCallback(async (data) => {
    try {
      setIsSubmitting(true);

      if (selectedIncident) {
        await updateIncident(selectedIncident.id, data);
        toast.success('Incident updated');
      } else {
        await createIncident(data);
        toast.success('Incident reported');
      }

      handleCloseForm();
      fetchData();
    } catch (err) {
      console.error('Failed to save incident:', err);
      toast.error(err.message || 'Failed to save incident report');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIncident, handleCloseForm, fetchData]);

  const handleQuickReport = useCallback(async (data) => {
    try {
      setIsSubmitting(true);
      await createIncident(data);
      toast.success('Incident reported');
      fetchData();
    } catch (err) {
      console.error('Failed to create incident:', err);
      toast.error(err.message || 'Failed to report incident');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;

    try {
      await deleteIncident(id);
      toast.success('Incident deleted');
      fetchData();
    } catch (err) {
      console.error('Failed to delete incident:', err);
      toast.error('Failed to delete incident');
    }
  }, [fetchData]);

  const handleResolve = useCallback(async (id) => {
    const notes = prompt('Enter resolution notes (optional):');

    try {
      await resolveIncident(id, { resolutionNotes: notes });
      toast.success('Incident resolved');
      fetchData();
    } catch (err) {
      console.error('Failed to resolve incident:', err);
      toast.error('Failed to resolve incident');
    }
  }, [fetchData]);

  const handleNotifyOwner = useCallback(async (id) => {
    if (!confirm('Send incident notification to owner?')) return;

    try {
      await notifyOwnerOfIncident(id);
      toast.success('Owner notified');
      fetchData();
    } catch (err) {
      console.error('Failed to notify owner:', err);
      toast.error('Failed to notify owner');
    }
  }, [fetchData]);

  const handleStatusChange = useCallback(async (id, newStatus) => {
    try {
      setUpdatingId(id);
      await updateIncident(id, { status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchData]);

  const handleSeverityChange = useCallback(async (id, newSeverity) => {
    try {
      setUpdatingId(id);
      await updateIncident(id, { severity: newSeverity });
      toast.success('Severity updated');
      fetchData();
    } catch (err) {
      console.error('Failed to update severity:', err);
      toast.error('Failed to update severity');
    } finally {
      setUpdatingId(null);
    }
  }, [fetchData]);

  const handlePetClick = useCallback((petId) => {
    if (petId) {
      navigate(`/pets/${petId}`);
    }
  }, [navigate]);

  const clearFilters = () => {
    setFilters({ status: '', severity: '', type: '', search: '' });
  };

  const hasActiveFilters = filters.status || filters.severity || filters.type || filters.search;

  if (loading) {
    return <LoadingState label="Loading incidents..." variant="mascot" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <nav className="mb-2">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Operations</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Incidents</li>
            </ol>
          </nav>
          <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Incident Reports</h1>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">Document and track incidents for compliance and liability protection</p>
        </div>

        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
        <StatCard
          icon={AlertTriangle}
          label="Total Incidents"
          value={stats.total}
          variant="primary"
        />
        <StatCard
          icon={AlertCircle}
          label="Open"
          value={stats.open}
          variant={stats.open > 0 ? 'danger' : 'success'}
        />
        <StatCard
          icon={Clock}
          label="Investigating"
          value={stats.investigating}
          variant={stats.investigating > 0 ? 'warning' : 'success'}
        />
        <StatCard
          icon={TrendingUp}
          label="Resolved This Week"
          value={stats.resolvedThisWeek}
          variant="success"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] flex-1 min-h-0">
        {/* Left: Incident List */}
        <div className="space-y-4 overflow-y-auto min-h-0">
          {/* Filter Bar */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="min-w-[140px]">
                <StyledSelect
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))
                  ]}
                  value={filters.status}
                  onChange={(opt) => setFilters({ ...filters, status: opt?.value || '' })}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              {/* Severity Filter */}
              <div className="min-w-[140px]">
                <StyledSelect
                  options={[
                    { value: '', label: 'All Severities' },
                    ...Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))
                  ]}
                  value={filters.severity}
                  onChange={(opt) => setFilters({ ...filters, severity: opt?.value || '' })}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              {/* Type Filter */}
              <div className="min-w-[130px]">
                <StyledSelect
                  options={[
                    { value: '', label: 'All Types' },
                    ...Object.entries(INCIDENT_TYPES).map(([key, cfg]) => ({ value: key, label: cfg.label }))
                  ]}
                  value={filters.type}
                  onChange={(opt) => setFilters({ ...filters, type: opt?.value || '' })}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
              </div>
            </div>

            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3" style={{ borderTop: '1px solid var(--bb-color-border-subtle)' }}>
                <span className="text-xs text-[color:var(--bb-color-text-muted)]">Active:</span>
                {filters.status && (
                  <button
                    onClick={() => setFilters({ ...filters, status: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    {STATUS_CONFIG[filters.status]?.label} <X className="h-3 w-3" />
                  </button>
                )}
                {filters.severity && (
                  <button
                    onClick={() => setFilters({ ...filters, severity: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    {SEVERITY_CONFIG[filters.severity]?.label} <X className="h-3 w-3" />
                  </button>
                )}
                {filters.type && (
                  <button
                    onClick={() => setFilters({ ...filters, type: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] rounded-full"
                  >
                    {INCIDENT_TYPES[filters.type]?.label} <X className="h-3 w-3" />
                  </button>
                )}
                {filters.search && (
                  <button
                    onClick={() => setFilters({ ...filters, search: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                    style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                  >
                    "{filters.search}" <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-[color:var(--bb-color-accent)] hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Incident List */}
          {filteredIncidents.length === 0 ? (
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
                {hasActiveFilters
                  ? 'No incidents match your current filters.'
                  : 'No incidents have been reported yet.'}
              </p>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onView={handleViewIncident}
                  onDelete={handleDelete}
                  onResolve={handleResolve}
                  onNotify={handleNotifyOwner}
                  onStatusChange={handleStatusChange}
                  onSeverityChange={handleSeverityChange}
                  onPetClick={handlePetClick}
                  isUpdating={updatingId === incident.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <IncidentSummary incidents={incidents} />
          <SeverityBreakdown incidents={incidents} />
          <TypeBreakdown incidents={incidents} />
          <QuickReport pets={pets} onSubmit={handleQuickReport} isSubmitting={isSubmitting} />
        </div>
      </div>

      {/* Incident Form Slideout */}
      <IncidentForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        incident={selectedIncident}
        isLoading={isSubmitting}
      />
    </div>
  );
}
