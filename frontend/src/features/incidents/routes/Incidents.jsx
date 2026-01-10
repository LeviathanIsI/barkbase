/**
 * Incidents Page
 * Redesigned operational page with stats, filters, and sidebar
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle, AlertCircle, Info, Clock, CheckCircle, CheckCircle2, Filter, Plus, Eye, Trash2, Bell, Search, X, TrendingUp, BarChart3, Zap, PawPrint, Loader2, Shield, ShieldCheck, ChevronDown, Siren } from 'lucide-react';
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

// Severity configuration with enhanced visual treatment
const SEVERITY_CONFIG = {
  LOW: {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Low',
    icon: Info,
    barColor: '#10b981',
    cardBorder: 'border-green-200 dark:border-green-800/50',
  },
  MEDIUM: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Medium',
    icon: AlertCircle,
    barColor: '#f59e0b',
    cardBorder: 'border-amber-200 dark:border-amber-800/50',
  },
  HIGH: {
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'High',
    icon: AlertTriangle,
    barColor: '#f97316',
    cardBorder: 'border-orange-300 dark:border-orange-700/50',
    cardBg: 'bg-orange-50/50 dark:bg-orange-950/20',
  },
  CRITICAL: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Critical',
    icon: Siren,
    barColor: '#ef4444',
    cardBorder: 'border-red-400 dark:border-red-600',
    cardBg: 'bg-red-50 dark:bg-red-950/30',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    pulse: true,
  },
};

// Status configuration with enhanced styling
const STATUS_CONFIG = {
  OPEN: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/40',
    label: 'Open',
    barColor: '#ef4444',
    urgent: true,
  },
  INVESTIGATING: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Investigating',
    barColor: '#f59e0b',
  },
  RESOLVED: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Resolved',
    barColor: '#10b981',
  },
  CLOSED: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    label: 'Closed',
    barColor: '#6b7280',
  },
};

// Incident type configuration with icons
const INCIDENT_TYPES = {
  INJURY: { label: 'Injury', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  ILLNESS: { label: 'Illness', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ESCAPE: { label: 'Escape', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  BITE: { label: 'Bite', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  FIGHT: { label: 'Fight', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  PROPERTY_DAMAGE: { label: 'Property', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  BEHAVIOR: { label: 'Behavior', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  OTHER: { label: 'Other', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
};

// Stat Card Component - Enhanced with urgent danger state
const StatCard = ({ icon: Icon, label, value, variant = 'primary', tooltip, urgent = false }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
      valueColor: 'text-[color:var(--bb-color-text-primary)]',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
      ring: 'ring-1 ring-amber-300 dark:ring-amber-700/50',
      valueColor: 'text-amber-700 dark:text-amber-300',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-300 dark:border-red-700/70',
      ring: 'ring-2 ring-red-400/50 dark:ring-red-500/40',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)] dark:shadow-[0_0_25px_rgba(239,68,68,0.35)]',
      valueColor: 'text-red-600 dark:text-red-400',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;
  const isDanger = variant === 'danger';
  const showUrgent = isDanger && urgent && value > 0;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border p-4 transition-all duration-300',
        styles.bg,
        styles.border,
        styles.ring,
        showUrgent && styles.glow
      )}
      title={tooltip}
    >
      {/* Urgent indicator bar */}
      {showUrgent && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-red-500 to-red-600" />
      )}

      {/* Pulse indicator for urgent */}
      {showUrgent && (
        <div className="absolute -top-1 -right-1 h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </div>
      )}

      <div className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform',
        styles.iconBg,
        showUrgent && 'scale-110'
      )}>
        <Icon className={cn('h-5 w-5', styles.icon, showUrgent && 'h-6 w-6')} />
      </div>
      <div className="min-w-0 text-left">
        <p className={cn(
          'text-[0.7rem] font-semibold uppercase tracking-wider',
          showUrgent ? 'text-red-600 dark:text-red-400' : 'text-[color:var(--bb-color-text-muted)]'
        )}>
          {label}
        </p>
        <p className={cn('text-2xl font-bold leading-tight', styles.valueColor)}>{value}</p>
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

// Incident Summary Sidebar Card - Enhanced with visual bars and empty state
const IncidentSummary = ({ incidents }) => {
  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, INVESTIGATING: 0, RESOLVED: 0, CLOSED: 0 };
    incidents.forEach(i => {
      if (counts[i.status] !== undefined) counts[i.status]++;
    });
    return counts;
  }, [incidents]);

  const total = incidents.length;
  const activeCount = statusCounts.OPEN + statusCounts.INVESTIGATING;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--bb-color-accent-soft)] flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Status Overview</h3>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">
              {total === 0 ? 'No incidents' : `${total} total, ${activeCount} active`}
            </p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-4">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All Clear</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">No active incidents</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const isUrgent = key === 'OPEN' && count > 0;

            return (
              <div key={key} className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-all',
                isUrgent && 'bg-red-50 dark:bg-red-950/20'
              )}>
                <div className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  count > 0 ? '' : 'opacity-30'
                )} style={{ backgroundColor: cfg.barColor }} />
                <span className={cn(
                  'text-sm w-24',
                  count > 0 ? 'font-medium text-[color:var(--bb-color-text-primary)]' : 'text-[color:var(--bb-color-text-muted)]'
                )}>{cfg.label}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-[color:var(--bb-color-bg-elevated)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: cfg.barColor }}
                  />
                </div>
                <span className={cn(
                  'text-sm font-bold w-8 text-right',
                  count > 0 ? cfg.color : 'text-[color:var(--bb-color-text-muted)]'
                )}>
                  {count > 0 ? count : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// By Severity Sidebar Card - Enhanced with visual weight for critical
const SeverityBreakdown = ({ incidents }) => {
  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    incidents.forEach(i => {
      if (counts[i.severity] !== undefined) counts[i.severity]++;
    });
    return counts;
  }, [incidents]);

  const total = incidents.length;
  const hasCritical = severityCounts.CRITICAL > 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all',
        hasCritical && 'ring-2 ring-red-400/50 border-red-300 dark:border-red-700'
      )}
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: hasCritical ? undefined : 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center',
          hasCritical ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/30'
        )}>
          <AlertTriangle className={cn(
            'h-4 w-4',
            hasCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
          )} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Severity</h3>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">
            {hasCritical ? `${severityCounts.CRITICAL} critical needs attention` : 'Severity distribution'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(key => {
          const cfg = SEVERITY_CONFIG[key];
          const count = severityCounts[key] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          const isCritical = key === 'CRITICAL' && count > 0;
          const SeverityIcon = cfg.icon;

          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg transition-all',
                isCritical && 'bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200 dark:ring-red-800'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                cfg.bg,
                count === 0 && 'opacity-40'
              )}>
                <SeverityIcon className={cn('h-4 w-4', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    'text-sm font-medium',
                    count > 0 ? 'text-[color:var(--bb-color-text-primary)]' : 'text-[color:var(--bb-color-text-muted)]'
                  )}>{cfg.label}</span>
                  <span className={cn(
                    'text-sm font-bold',
                    count > 0 ? cfg.color : 'text-[color:var(--bb-color-text-muted)]'
                  )}>
                    {count > 0 ? count : '—'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-[color:var(--bb-color-bg-elevated)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%`, backgroundColor: cfg.barColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// By Type Sidebar Card - Enhanced with better grid layout
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

  const hasAnyIncidents = Object.values(typeCounts).some(c => c > 0);
  const sortedTypes = Object.entries(typeCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">By Type</h3>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">
            {hasAnyIncidents ? `${sortedTypes.length} type${sortedTypes.length !== 1 ? 's' : ''} recorded` : 'No incidents recorded'}
          </p>
        </div>
      </div>

      {hasAnyIncidents ? (
        <div className="grid grid-cols-2 gap-2">
          {sortedTypes.map(([key, count]) => {
            const cfg = INCIDENT_TYPES[key];
            return (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg transition-all',
                  cfg.bg
                )}
              >
                <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
                <span className={cn('text-sm font-bold', cfg.color)}>{count}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4">
          <Shield className="h-8 w-8 mx-auto mb-2 text-[color:var(--bb-color-text-muted)]" />
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Types will appear here when incidents are logged</p>
        </div>
      )}
    </div>
  );
};

// Quick Report Sidebar Card - Enhanced with collapsible design
const QuickReport = ({ pets, onSubmit, isSubmitting }) => {
  const [isExpanded, setIsExpanded] = useState(true);
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

  const severityConfig = SEVERITY_CONFIG[form.severity];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">Quick Report</h3>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">Log incident in seconds</p>
          </div>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-[color:var(--bb-color-text-muted)] transition-transform duration-200',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Collapsible form */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}>
        <div className="overflow-hidden">
          <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3">
            {/* Severity quick select */}
            <div className="flex gap-1 p-1 rounded-lg bg-[color:var(--bb-color-bg-elevated)]">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(sev => {
                const cfg = SEVERITY_CONFIG[sev];
                const isActive = form.severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setForm({ ...form, severity: sev })}
                    className={cn(
                      'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
                      isActive
                        ? cn(cfg.bg, cfg.color, 'shadow-sm')
                        : 'text-[color:var(--bb-color-text-muted)] hover:bg-[color:var(--bb-color-bg-surface)]'
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5 block">Pet involved *</label>
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

            <div>
              <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5 block">Incident type</label>
              <StyledSelect
                options={Object.entries(INCIDENT_TYPES).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                value={form.incidentType}
                onChange={(opt) => setForm({ ...form, incidentType: opt?.value || 'ILLNESS' })}
                isClearable={false}
                isSearchable={false}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[color:var(--bb-color-text-muted)] mb-1.5 block">What happened? *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of the incident..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] transition-all"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !form.petId || !form.title.trim()}
              className={cn(
                'w-full transition-all',
                form.severity === 'CRITICAL' && 'bg-red-600 hover:bg-red-700',
                form.severity === 'HIGH' && 'bg-orange-600 hover:bg-orange-700'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Report {severityConfig.label} Incident
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Incident Card Component - Enhanced with severity-based styling
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
  const statusConfig = STATUS_CONFIG[incident.status] || STATUS_CONFIG.OPEN;
  const SeverityIcon = severityConfig.icon;
  const isCritical = incident.severity === 'CRITICAL';
  const isHigh = incident.severity === 'HIGH';
  const isOpen = incident.status === 'OPEN';
  const isUrgent = (isCritical || isHigh) && isOpen;
  const isResolved = incident.status === 'RESOLVED' || incident.status === 'CLOSED';

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-l-4 cursor-pointer transition-all duration-200 group',
        severityConfig.cardBorder,
        severityConfig.cardBg,
        isUrgent && severityConfig.glow,
        isResolved && 'opacity-60',
        'hover:shadow-lg hover:-translate-y-0.5'
      )}
      style={{
        backgroundColor: severityConfig.cardBg ? undefined : 'var(--bb-color-bg-surface)',
      }}
      onClick={() => onView?.(incident)}
    >
      {/* Critical pulse indicator */}
      {isCritical && isOpen && (
        <div className="absolute -top-1 -right-1 h-4 w-4">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center">
            <span className="text-[8px] font-bold text-white">!</span>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Severity icon with enhanced styling */}
          <div className={cn(
            'p-2.5 rounded-xl flex-shrink-0 transition-transform',
            severityConfig.bg,
            isUrgent && 'scale-110'
          )}>
            <SeverityIcon className={cn('h-5 w-5', severityConfig.color)} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row with badges */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className={cn(
                'font-semibold text-base',
                isResolved ? 'line-through text-[color:var(--bb-color-text-muted)]' : 'text-[color:var(--bb-color-text-primary)]'
              )}>
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

            {/* Description */}
            <p className={cn(
              'text-sm mb-3 line-clamp-2',
              isResolved ? 'text-[color:var(--bb-color-text-muted)]' : 'text-[color:var(--bb-color-text-secondary)]'
            )}>
              {incident.description || 'No description provided'}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              {/* Pet */}
              {incident.petName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPetClick?.(incident.petId);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color:var(--bb-color-accent-soft)] text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent)]/20 transition-colors"
                >
                  <PawPrint className="h-3 w-3" />
                  <span className="font-medium">{incident.petName}</span>
                </button>
              )}

              {/* Timestamp */}
              <span className="flex items-center gap-1 text-[color:var(--bb-color-text-muted)]">
                <Clock className="h-3 w-3" />
                {formatDate(incident.incidentDate)}
              </span>

              {/* Type badge */}
              {incident.incidentType && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  INCIDENT_TYPES[incident.incidentType?.toUpperCase()]?.bg,
                  INCIDENT_TYPES[incident.incidentType?.toUpperCase()]?.color
                )}>
                  {incident.incidentType.replace('_', ' ')}
                </span>
              )}

              {/* Owner notified badge */}
              {incident.ownerNotified && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-medium">Owner notified</span>
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
          {!isResolved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResolve(incident.id);
              }}
              title="Resolve"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
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
          <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">Incident Reports</h1>
          <p className="text-[var(--bb-body-size)] leading-[var(--bb-body-leading)] text-[color:var(--bb-color-text-muted)] mt-1">Document and track incidents for compliance and liability protection</p>
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
          urgent={stats.open > 0}
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
              className="p-8 text-center rounded-xl border"
              style={{
                backgroundColor: 'var(--bb-color-bg-surface)',
                borderColor: hasActiveFilters ? 'var(--bb-color-border-subtle)' : undefined,
              }}
            >
              {hasActiveFilters ? (
                <>
                  <Filter className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
                  <h3 className="text-lg font-medium mb-2 text-[color:var(--bb-color-text-primary)]">
                    No matching incidents
                  </h3>
                  <p className="text-sm mb-4 text-[color:var(--bb-color-text-muted)]">
                    No incidents match your current filters.
                  </p>
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </>
              ) : (
                <div className="bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-950/20 dark:to-transparent rounded-xl py-8">
                  <div className="relative inline-flex mb-4">
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl scale-150" />
                    <ShieldCheck className="relative h-16 w-16 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-emerald-700 dark:text-emerald-400">
                    All Clear!
                  </h3>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-1">
                    No incidents to report.
                  </p>
                  <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                    Things are running smoothly.
                  </p>
                </div>
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
