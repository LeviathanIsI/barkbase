import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import SettingsPage from '../components/SettingsPage';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const createEvent = (offsetDays, data) => ({
  timestamp: new Date(now.getTime() - offsetDays * DAY_IN_MS).toISOString(),
  ...data,
});

const ACTION_META = {
  'booking.created': {
    label: 'Booking created',
    group: 'Bookings',
    variant: 'info',
    icon: CalendarCheck2,
  },
  'booking.cancelled': {
    label: 'Booking cancelled',
    group: 'Bookings',
    variant: 'warning',
    icon: CalendarX,
  },
  'team.invite.sent': {
    label: 'Team invite sent',
    group: 'Team',
    variant: 'info',
    icon: Users,
  },
  'team.role.updated': {
    label: 'Role updated',
    group: 'Team',
    variant: 'warning',
    icon: ShieldCheck,
  },
  'security.login.failed': {
    label: 'Failed login attempt',
    group: 'Security',
    variant: 'danger',
    icon: ShieldAlert,
    severity: 'high',
  },
  'security.login.succeeded': {
    label: 'Successful login',
    group: 'Security',
    variant: 'neutral',
    icon: ShieldCheck,
  },
  'security.mfa.disabled': {
    label: 'MFA disabled',
    group: 'Security',
    variant: 'danger',
    icon: AlertTriangle,
    severity: 'high',
  },
  'settings.audit.exported': {
    label: 'Audit log exported',
    group: 'Compliance',
    variant: 'info',
    icon: Download,
  },
  'data.export.generated': {
    label: 'Workspace export generated',
    group: 'Compliance',
    variant: 'info',
    icon: FileText,
  },
};

const FALLBACK_META = {
  label: 'Custom event',
  group: 'Misc',
  variant: 'neutral',
  icon: FileText,
};

const AUDIT_EVENTS = [
  createEvent(0.2, { recordId: 'log_1007',
    action: 'security.login.failed',
    entityType: 'session',
    entityName: 'Portal login',
    actor: { name: 'Unknown user', email: 'n/a' },
    source: 'Web portal',
    ipAddress: '198.51.100.12',
    location: 'Seattle, WA',
    metadata: { reason: 'Invalid password' },
  }),
  createEvent(0.8, { recordId: 'log_1001',
    action: 'booking.created',
    entityType: 'booking',
    entityName: 'Overnight stay for Luna',
    actor: { name: 'Danielle Boyd', email: 'danielle@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '172.16.0.16',
    location: 'Portland, OR',
    metadata: { status: 'confirmed', deposit: 75 },
    diff: {
      checkIn: '2025-10-15T16:00:00Z',
      checkOut: '2025-10-18T17:00:00Z',
      kennel: 'Luxury Suite 3',
    },
  }),
  createEvent(1.6, { recordId: 'log_1002',
    action: 'booking.cancelled',
    entityType: 'booking',
    entityName: 'Daycare for Clover',
    actor: { name: 'Maxwell Grant', email: 'max@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '172.16.0.32',
    location: 'Portland, OR',
    metadata: { reason: 'Owner request', refund: 'Pending' },
  }),
  createEvent(2.2, { recordId: 'log_1003',
    action: 'team.invite.sent',
    entityType: 'membership',
    entityName: 'Invite: julia@resortpaws.com',
    actor: { name: 'Olivia Hart', email: 'olivia@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '172.16.0.8',
    location: 'Portland, OR',
    metadata: { role: 'Staff', expiresAt: '2025-10-20T00:00:00Z' },
  }),
  createEvent(3.1, { recordId: 'log_1004',
    action: 'settings.audit.exported',
    entityType: 'audit-log',
    entityName: 'Audit CSV download',
    actor: { name: 'Olivia Hart', email: 'olivia@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '172.16.0.8',
    location: 'Portland, OR',
    metadata: { window: '2025-09-01 → 2025-10-10', format: 'csv' },
  }),
  createEvent(5.7, { recordId: 'log_1005',
    action: 'team.role.updated',
    entityType: 'membership',
    entityName: 'Role change: jose@hadeshome.com',
    actor: { name: 'Danielle Boyd', email: 'danielle@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '172.16.0.16',
    location: 'Portland, OR',
    metadata: { previousRole: 'Staff', nextRole: 'Manager' },
    diff: { role: ['Staff', 'Manager'] },
  }),
  createEvent(9.5, { recordId: 'log_1006',
    action: 'security.login.succeeded',
    entityType: 'session',
    entityName: 'App login',
    actor: { name: 'Josephine Kemp', email: 'jo@hadeshome.com' },
    source: 'Mobile',
    ipAddress: '203.0.113.55',
    location: 'Boise, ID',
    metadata: { device: 'iPhone 15 Pro', mfa: true },
  }),
  createEvent(14, { recordId: 'log_1008',
    action: 'security.mfa.disabled',
    entityType: 'security',
    entityName: 'MFA status changed',
    actor: { name: 'System Administrator', email: 'admin@barkbase.com' },
    source: 'Admin API',
    ipAddress: '10.0.1.5',
    location: 'Austin, TX',
    metadata: { user: 'guest@pinepaws.com', reason: 'Device reset' },
  }),
  createEvent(21, { recordId: 'log_1009',
    action: 'data.export.generated',
    entityType: 'export',
    entityName: 'Workspace export archive',
    actor: { name: 'Josephine Kemp', email: 'jo@hadeshome.com' },
    source: 'Dashboard',
    ipAddress: '203.0.113.55',
    location: 'Boise, ID',
    metadata: { size: '12.4 MB', format: 'zip' },
  }),
];

const GROUP_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'Security', label: 'Security & access' },
  { value: 'Bookings', label: 'Bookings' },
  { value: 'Team', label: 'Team management' },
  { value: 'Compliance', label: 'Compliance & exports' },
];

const TIMEFRAME_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const TIMEFRAME_WINDOWS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * DAY_IN_MS,
  '30d': 30 * DAY_IN_MS,
  '90d': 90 * DAY_IN_MS,
};

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
  const retentionDays = features.auditRetentionDays ?? 0;
  const canExport = Boolean(features.auditLogAccess);

  const [filters, setFilters] = useState({
    query: '',
    group: 'all',
    timeframe: '30d',
  });

  const filteredEvents = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();
    const windowMs = TIMEFRAME_WINDOWS[filters.timeframe] ?? null;
    const nowMs = Date.now();

    const matches = AUDIT_EVENTS.filter((event) => {
      const meta = ACTION_META[event.action] ?? FALLBACK_META;

      if (filters.group !== 'all' && meta.group !== filters.group) {
        return false;
      }

      if (windowMs) {
        const eventTime = parseISO(event.timestamp).getTime();
        if (nowMs - eventTime > windowMs) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

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

    return matches.sort((a, b) => {
      return parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime();
    });
  }, [filters.group, filters.query, filters.timeframe]);

  const [selectedEvent, setSelectedEvent] = useState(filteredEvents[0] ?? null);

  useEffect(() => {
    if (!filteredEvents.length) {
      setSelectedEvent(null);
      return;
    }

    const stillVisible = selectedEvent && filteredEvents.some((event) => event.recordId === selectedEvent.recordId);
    if (!stillVisible) {
      setSelectedEvent(filteredEvents[0]);
    }
  }, [filteredEvents, selectedEvent]);

  const timeframeLabel = TIMEFRAME_OPTIONS.find((option) => option.value === filters.timeframe)?.label ?? 'Custom window';
  const highRiskCount = useMemo(
    () => filteredEvents.filter((event) => (ACTION_META[event.action] ?? FALLBACK_META).severity === 'high').length,
    [filteredEvents],
  );
  const uniqueActorCount = useMemo(() => {
    const actors = filteredEvents.map((event) => event.actor?.email ?? event.actor?.name ?? 'System');
    return new Set(actors).size;
  }, [filteredEvents]);

  const handleFilterChange = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleQueryChange = (event) => {
    setFilters((current) => ({ ...current, query: event.target.value }));
  };

  return (
    <SettingsPage
      title="Audit Log"
      description="Monitor staff actions, security signals, and configuration changes across your BarkBase workspace."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
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
              >
                {GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Timeframe"
                value={filters.timeframe}
                onChange={handleFilterChange('timeframe')}
                aria-label="Filter audit log by timeframe"
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
            </div>
          </Card>

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
            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-surface/70 p-6 text-center">
                  <p className="text-sm font-medium text-text">No events match your filters.</p>
                  <p className="mt-1 text-xs text-muted">
                    Adjust the timeframe or clear the search query to expand the results.
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const meta = ACTION_META[event.action] ?? FALLBACK_META;
                  const Icon = meta.icon ?? FileText;
                  const isSelected = selectedEvent?.recordId === event.recordId;
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
                          <div>{format(parseISO(event.timestamp), 'MMM d, yyyy h:mm a')}</div>
                          <div className="mt-0.5 text-[11px] uppercase tracking-wide">
                            {formatDistanceToNowStrict(parseISO(event.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
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
                <Button variant="secondary" disabled={!canExport}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="ghost" disabled>
                  <FileText className="h-4 w-4" />
                  Schedule delivery
                </Button>
              </div>
              {!canExport ? (
                <p className="text-xs text-warning">
                  Upgrade to Pro or Enterprise to unlock on-demand exports and retention beyond {formatRetention(retentionDays)}.
                </p>
              ) : (
                <p className="text-xs">
                  Exports are retained for 7 days. You will receive an email once the archive finishes processing.
                </p>
              )}
            </div>
          </Card>

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
    </SettingsPage>
  );
};

const EventDetails = ({ event }) => {
  const meta = ACTION_META[event.action] ?? FALLBACK_META;
  const timestamp = parseISO(event.timestamp);
  const metadataEntries = Object.entries(event.metadata ?? {});
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
                  <dd className="font-mono text-muted">{String(value)}</dd>
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
