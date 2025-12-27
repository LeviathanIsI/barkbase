import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarX,
  Download,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Users,
  RefreshCw,
  Settings,
  CreditCard,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import apiClient from '@/lib/apiClient';

// Action metadata for display styling - maps actions to frontend format
const ACTION_META = {
  // Authentication actions
  'login': { label: 'Successful login', group: 'Security', variant: 'neutral', icon: ShieldCheck },
  'login_failed': { label: 'Failed login attempt', group: 'Security', variant: 'danger', icon: ShieldAlert, severity: 'high' },
  'logout': { label: 'Logged out', group: 'Security', variant: 'neutral', icon: ShieldCheck },
  'password_change': { label: 'Password changed', group: 'Security', variant: 'warning', icon: ShieldCheck },
  'password_reset': { label: 'Password reset', group: 'Security', variant: 'warning', icon: ShieldCheck },
  'mfa_enabled': { label: 'MFA enabled', group: 'Security', variant: 'success', icon: ShieldCheck },
  'mfa_disabled': { label: 'MFA disabled', group: 'Security', variant: 'danger', icon: AlertTriangle, severity: 'high' },
  
  // Booking actions
  'booking.created': { label: 'Booking created', group: 'Bookings', variant: 'info', icon: CalendarCheck2 },
  'booking.updated': { label: 'Booking updated', group: 'Bookings', variant: 'info', icon: CalendarCheck2 },
  'booking.cancelled': { label: 'Booking cancelled', group: 'Bookings', variant: 'warning', icon: CalendarX },
  'check_in': { label: 'Pet checked in', group: 'Bookings', variant: 'success', icon: CalendarCheck2 },
  'check_out': { label: 'Pet checked out', group: 'Bookings', variant: 'success', icon: CalendarCheck2 },
  
  // Team actions
  'team.invite.sent': { label: 'Team invite sent', group: 'Team', variant: 'info', icon: Users },
  'team.role.updated': { label: 'Role updated', group: 'Team', variant: 'warning', icon: ShieldCheck },
  'permission_change': { label: 'Permissions changed', group: 'Team', variant: 'warning', icon: ShieldCheck },
  
  // Financial actions
  'payment': { label: 'Payment processed', group: 'Financial', variant: 'success', icon: CreditCard },
  'refund': { label: 'Refund issued', group: 'Financial', variant: 'warning', icon: CreditCard },
  
  // Data operations
  'export': { label: 'Data exported', group: 'Compliance', variant: 'info', icon: Download },
  'import': { label: 'Data imported', group: 'Compliance', variant: 'info', icon: FileText },
  'settings.audit.exported': { label: 'Audit log exported', group: 'Compliance', variant: 'info', icon: Download },
  'data.export.generated': { label: 'Workspace export generated', group: 'Compliance', variant: 'info', icon: FileText },
  
  // Config changes
  'config_change': { label: 'Settings changed', group: 'Settings', variant: 'warning', icon: Settings },
  
  // CRUD operations
  'create': { label: 'Created', group: 'Data', variant: 'info', icon: FileText },
  'update': { label: 'Updated', group: 'Data', variant: 'info', icon: FileText },
  'delete': { label: 'Deleted', group: 'Data', variant: 'warning', icon: FileText },
  'read': { label: 'Viewed', group: 'Data', variant: 'neutral', icon: FileText },
};

const FALLBACK_META = {
  label: 'Activity',
  group: 'Misc',
  variant: 'neutral',
  icon: FileText,
};

const GROUP_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'Security', label: 'Security & access' },
  { value: 'Bookings', label: 'Bookings' },
  { value: 'Team', label: 'Team management' },
  { value: 'Compliance', label: 'Compliance & exports' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Settings', label: 'Settings' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const formatRetention = (days) => {
  if (!Number.isFinite(days) || days <= 0) {
    return 'Not retained on this plan';
  }
  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  if (days % 30 === 0) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${days} day${days > 1 ? 's' : ''}`;
};

const AuditLog = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const features = tenant?.features ?? {};
  const retentionDays = features.auditRetentionDays ?? 365; // Default 1 year
  const canExport = true; // Enable export for all users

  // State
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({ totalEvents: 0, uniqueActors: 0, highRiskCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [filters, setFilters] = useState({
    query: '',
    group: 'all',
    timeframe: '30d',
  });

  // Fetch audit logs from API
  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        timeframe: filters.timeframe,
        limit: 100,
      };
      
      if (filters.group && filters.group !== 'all') {
        params.group = filters.group;
      }
      
      if (filters.query) {
        params.search = filters.query;
      }

      const { data } = await apiClient.get('/api/v1/audit-logs', { params });
      
      // Transform events to expected format
      const transformedEvents = (data?.events || []).map(event => ({
        ...event,
        // Use _meta from API or fallback to local ACTION_META
        _localMeta: ACTION_META[event.action] || FALLBACK_META,
      }));
      
      setEvents(transformedEvents);
      
      // Select first event if none selected
      if (transformedEvents.length > 0 && !selectedEvent) {
        setSelectedEvent(transformedEvents[0]);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      // Don't show error - just show empty state
      setEvents([]);
      setSelectedEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters.timeframe, filters.group, filters.query]);

  // Fetch summary stats
  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/audit-logs/summary', {
        params: { timeframe: filters.timeframe }
      });
      setSummary({
        totalEvents: data?.totalEvents || 0,
        uniqueActors: data?.uniqueActors || 0,
        highRiskCount: data?.highRiskCount || 0,
      });
    } catch (err) {
      // Silently handle - summary is supplementary, use default values
      setSummary({ totalEvents: 0, uniqueActors: 0, highRiskCount: 0 });
    }
  }, [filters.timeframe]);

  // Initial load and refresh on filter changes
  useEffect(() => {
    fetchAuditLogs();
    fetchSummary();
  }, [fetchAuditLogs, fetchSummary]);

  // Filter events client-side for search (API already filtered by group and timeframe)
  const filteredEvents = useMemo(() => {
    if (!filters.query) return events;
    
    const normalizedQuery = filters.query.trim().toLowerCase();
    return events.filter(event => {
      const meta = event._meta || event._localMeta || FALLBACK_META;
      const haystack = [
        event.entityName,
        event.entityType,
        event.actor?.name,
        event.actor?.email,
        meta.label,
        event.action,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      
      return haystack.includes(normalizedQuery);
    });
  }, [events, filters.query]);

  // Keep selected event in sync with filtered list
  useEffect(() => {
    if (!filteredEvents.length) {
      setSelectedEvent(null);
      return;
    }

    const stillVisible = selectedEvent && filteredEvents.some(
      event => event.recordId === selectedEvent.recordId
    );
    if (!stillVisible) {
      setSelectedEvent(filteredEvents[0]);
    }
  }, [filteredEvents, selectedEvent]);

  // Calculate stats from filtered events
  const highRiskCount = useMemo(() => {
    return filteredEvents.filter(event => {
      const meta = event._meta || event._localMeta || FALLBACK_META;
      return meta.severity === 'high';
    }).length;
  }, [filteredEvents]);

  const uniqueActorCount = useMemo(() => {
    const actors = filteredEvents.map(
      event => event.actor?.email ?? event.actor?.name ?? 'System'
    );
    return new Set(actors).size;
  }, [filteredEvents]);

  const timeframeLabel = TIMEFRAME_OPTIONS.find(
    option => option.value === filters.timeframe
  )?.label ?? 'Custom window';

  // Handlers
  const handleFilterChange = (key) => (event) => {
    const value = event.target.value;
    setFilters(current => ({ ...current, [key]: value }));
  };

  const handleQueryChange = (event) => {
    setFilters(current => ({ ...current, query: event.target.value }));
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/audit-logs/export?timeframe=${filters.timeframe}&format=csv`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
            'X-Tenant-Id': tenant?.recordId || '',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_log_${filters.timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    fetchAuditLogs();
    fetchSummary();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Filter Card */}
          <Card
            title="Filter events"
            description="Combine search, category, and timeframe to focus on the events that matter right now."
          >
            <div className="flex flex-col gap-4 lg:flex-row">
              <Input
                label="Search"
                placeholder="Search by user, entity, or action"
                value={filters.query}
                onChange={handleQueryChange}
                aria-label="Search audit log entries"
              />
              <Select
                label="Category"
                value={filters.group}
                onChange={handleFilterChange('group')}
                aria-label="Filter audit log by category"
                options={GROUP_OPTIONS}
                menuPortalTarget={document.body}
              />
              <Select
                label="Timeframe"
                value={filters.timeframe}
                onChange={handleFilterChange('timeframe')}
                aria-label="Filter audit log by timeframe"
                options={TIMEFRAME_OPTIONS}
                menuPortalTarget={document.body}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>
                Showing <span className="font-semibold text-text">{filteredEvents.length}</span> event
                {filteredEvents.length === 1 ? '' : 's'} • {timeframeLabel}
              </span>
              <span>
                Actors involved: <span className="font-semibold text-text">{uniqueActorCount}</span>
              </span>
              {highRiskCount > 0 ? (
                <Badge variant="danger">{highRiskCount} high-risk</Badge>
              ) : (
                <Badge variant="neutral">No high-risk events</Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
                className="ml-auto"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                  Dismiss
                </Button>
              </div>
            </Card>
          )}

          {/* Activity Stream Card */}
          <Card
            header={(
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-text">Activity stream</h3>
                  <p className="text-sm text-muted">Newest events first. Click a row to inspect the full payload.</p>
                </div>
                <Badge variant="neutral">{filteredEvents.length} in view</Badge>
              </div>
            )}
          >
            {isLoading && events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 bg-surface/70 p-6 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted/50 mb-3" />
                    <p className="text-sm font-medium text-text">No audit events found</p>
                    <p className="mt-1 text-xs text-muted">
                      {filters.query || filters.group !== 'all' 
                        ? 'Adjust the timeframe or clear the search query to expand the results.'
                        : 'Activity will appear here as you and your team use BarkBase. Check-ins, bookings, and security events are all tracked.'}
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((event) => {
                    const meta = event._meta || event._localMeta || ACTION_META[event.action] || FALLBACK_META;
                    const Icon = meta.icon || ACTION_META[event.action]?.icon || FileText;
                    const isSelected = selectedEvent?.recordId === event.recordId;
                    const timestamp = typeof event.timestamp === 'string' 
                      ? parseISO(event.timestamp) 
                      : new Date(event.timestamp);
                    
                    return (
                      <button
                        key={event.recordId}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                          isSelected
                            ? 'border-primary/40 bg-primary/10 shadow-sm'
                            : 'border-transparent hover:border-border/70 hover:bg-surface/80',
                        )}
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-1 items-start gap-3">
                            <div className="mt-0.5">
                              <Icon className={cn('h-5 w-5 text-muted', isSelected && 'text-primary')} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-text">{event.entityName}</p>
                                <Badge variant={meta.variant ?? 'neutral'}>{meta.group}</Badge>
                              </div>
                              <p className="text-xs text-muted">
                                {meta.label} • {event.actor?.name ?? 'System'} {event.actor?.email ? `(${event.actor.email})` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-muted lg:text-right">
                            <div>{format(timestamp, 'MMM d, yyyy h:mm a')}</div>
                            <div className="mt-0.5 text-[11px] uppercase tracking-wide">
                              {formatDistanceToNowStrict(timestamp, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Retention & Exports Card */}
          <Card title="Retention & exports" description="Understand how long BarkBase retains events and how to hand off audit artifacts.">
            <div className="space-y-4 text-sm text-muted">
              <div className="rounded-lg border border-border/70 bg-surface/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Retention window</p>
                <p className="mt-1 text-sm font-medium text-text">{formatRetention(retentionDays)}</p>
                <p className="mt-1 text-xs">
                  BarkBase automatically removes audit entries older than your plan allows. Upgrade to extend retention.
                </p>
              </div>
              <div className="space-y-2">
                <p>Exports include metadata, diff payloads, actor IP history, and geolocation hints.</p>
                <p className="text-xs">
                  Schedule automatic deliveries to an S3 bucket or compliance inbox once exports are enabled for your plan.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="secondary" 
                  onClick={handleExportCSV}
                  disabled={isExporting || filteredEvents.length === 0}
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export CSV
                </Button>
                <Button variant="ghost" disabled>
                  <FileText className="h-4 w-4" />
                  Schedule delivery
                </Button>
              </div>
              <p className="text-xs">
                Exports are retained for 7 days. You will receive an email once the archive finishes processing.
              </p>
            </div>
          </Card>

          {/* Event Details Card */}
          <Card title="Event details" description="Inspect the full payload for a specific audit entry.">
            {selectedEvent ? (
              <EventDetails event={selectedEvent} />
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-surface/70 p-6 text-center">
                <p className="text-sm font-medium text-text">Select an event to see the full context.</p>
                <p className="mt-1 text-xs text-muted">
                  Use the filters on the left to find specific actors, entities, or security signals.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const EventDetails = ({ event }) => {
  const meta = event._meta || event._localMeta || ACTION_META[event.action] || FALLBACK_META;
  const timestamp = typeof event.timestamp === 'string' 
    ? parseISO(event.timestamp) 
    : new Date(event.timestamp);
  const metadataEntries = Object.entries(event.metadata ?? {}).filter(
    ([key]) => !['location', 'status', 'failureReason'].includes(key) || event.metadata[key]
  );
  const hasDiff = Boolean(event.diff);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-text">{meta.label}</p>
          <Badge variant={meta.variant ?? 'neutral'}>{meta.group}</Badge>
        </div>
        <div className="text-xs text-muted">
          Event ID <span className="font-mono text-text">{event.recordId}</span> &middot;{' '}
          {format(timestamp, 'MMM d, yyyy h:mm a')} ({formatDistanceToNowStrict(timestamp, { addSuffix: true })})
        </div>
        {meta.severity === 'high' ? (
          <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertTriangle className="h-4 w-4" />
            This event is flagged as high risk. Review the actor's access and confirm the change was intentional.
          </div>
        ) : null}
      </div>

      <dl className="grid gap-4 text-sm text-muted">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Actor</dt>
          <dd className="mt-1 text-sm text-text">
            {event.actor?.name ?? 'System service'}
            {event.actor?.email ? <span className="text-muted"> ({event.actor.email})</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Entity</dt>
          <dd className="mt-1 text-sm text-text">
            {event.entityName}
            <span className="ml-2 text-xs uppercase tracking-wide text-muted">{event.entityType}</span>
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Source</dt>
            <dd className="mt-1 text-sm text-text">{event.source ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">IP address</dt>
            <dd className="mt-1 font-mono text-xs text-text">{event.ipAddress ?? 'Not recorded'}</dd>
          </div>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Location hint</dt>
          <dd className="mt-1 text-sm text-text">{event.location ?? 'Unavailable'}</dd>
        </div>
      </dl>

      {metadataEntries.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Metadata</p>
          <div className="rounded-lg border border-border/70 bg-surface/70 p-3 text-xs">
            <dl className="grid gap-2">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="flex flex-wrap justify-between gap-2">
                  <dt className="font-medium text-text">{key}</dt>
                  <dd className="font-mono text-muted">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}

      {hasDiff ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Change summary (diff)</p>
          <pre className="max-h-64 overflow-auto rounded-lg border border-border/70 bg-surface/70 px-3 py-2 text-xs text-muted">
            {JSON.stringify(event.diff, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

export default AuditLog;
