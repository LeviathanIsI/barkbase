/**
 * ActivityTimeline - Display activity logs in a timeline format
 * Shows notes, calls, emails, SMS grouped by date
 */

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from 'date-fns';
import {
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Settings,
  MoreHorizontal,
  Pin,
  Trash2,
  Edit,
  Plus,
  Filter,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useActivities, useDeleteActivity, useUpdateActivity } from '../api';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import toast from 'react-hot-toast';

// Activity type configurations
const ACTIVITY_TYPE_CONFIG = {
  note: { icon: FileText, label: 'Note', color: 'var(--bb-color-info)' },
  call: { icon: Phone, label: 'Call', color: 'var(--bb-color-status-positive)' },
  email: { icon: Mail, label: 'Email', color: 'var(--bb-color-purple)' },
  sms: { icon: MessageSquare, label: 'SMS', color: 'var(--bb-color-status-caution)' },
  system: { icon: Settings, label: 'System', color: 'var(--bb-color-text-muted)' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'note', label: 'Notes' },
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'sms', label: 'SMS' },
  { value: 'system', label: 'System' },
];

/**
 * Format date for grouping
 */
function formatDateGroup(dateStr) {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

/**
 * Group activities by date
 */
function groupActivitiesByDate(activities) {
  const groups = {};

  activities.forEach((activity) => {
    const dateKey = startOfDay(new Date(activity.createdAt)).toISOString();
    const label = formatDateGroup(activity.createdAt);

    if (!groups[dateKey]) {
      groups[dateKey] = { label, activities: [] };
    }
    groups[dateKey].activities.push(activity);
  });

  // Sort by date descending
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([, group]) => group);
}

/**
 * ActivityTimeline component
 * @param {string} entityType - 'owner', 'pet', 'booking', 'invoice'
 * @param {string} entityId - UUID of the entity
 * @param {string} defaultEmail - Pre-filled email for new activities
 * @param {string} defaultPhone - Pre-filled phone for new activities
 */
export default function ActivityTimeline({
  entityType,
  entityId,
  defaultEmail,
  defaultPhone,
  className,
}) {
  const [filter, setFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const { openSlideout } = useSlideout();

  // Fetch activities
  const { data, isLoading, error } = useActivities(entityType, entityId, {
    activityType: filter === 'all' ? undefined : filter,
  });

  const deleteMutation = useDeleteActivity();
  const updateMutation = useUpdateActivity();

  const activities = data?.data || [];

  // Group activities by date
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(activities);
  }, [activities]);

  // Handle log activity button
  const handleLogActivity = () => {
    openSlideout(SLIDEOUT_TYPES.ACTIVITY_LOG, {
      entityType,
      entityId,
      defaultEmail,
      defaultPhone,
    });
  };

  // Handle delete activity
  const handleDelete = async (activity) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      await deleteMutation.mutateAsync({
        id: activity.id,
        entityType,
        entityId,
      });
      toast.success('Activity deleted');
    } catch (error) {
      toast.error('Failed to delete activity');
    }
  };

  // Handle toggle pin
  const handleTogglePin = async (activity) => {
    try {
      await updateMutation.mutateAsync({
        id: activity.id,
        isPinned: !activity.isPinned,
      });
      toast.success(activity.isPinned ? 'Unpinned' : 'Pinned');
    } catch (error) {
      toast.error('Failed to update activity');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Activity Timeline
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <p className="text-sm" style={{ color: 'var(--bb-color-status-negative)' }}>
          Failed to load activities
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          Activity Timeline
        </h3>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              {FILTER_OPTIONS.find((o) => o.value === filter)?.label}
            </Button>
            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg border shadow-lg min-w-[160px]"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-surface)',
                    borderColor: 'var(--bb-color-border-subtle)',
                  }}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-[var(--bb-color-bg-elevated)]',
                        filter === option.value && 'bg-[var(--bb-color-bg-elevated)]'
                      )}
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Log Activity Button */}
          <Button variant="primary" size="sm" onClick={handleLogActivity}>
            <Plus className="w-4 h-4 mr-1" />
            Log Activity
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {groupedActivities.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No activities logged yet
          </p>
          <Button variant="outline" size="sm" onClick={handleLogActivity} className="mt-3">
            <Plus className="w-4 h-4 mr-1" />
            Log your first activity
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <div key={group.label}>
              {/* Date Header */}
              <div
                className="text-xs font-semibold uppercase tracking-wide mb-3 pb-2 border-b"
                style={{
                  color: 'var(--bb-color-text-muted)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                {group.label}
              </div>

              {/* Activities */}
              <div className="space-y-3">
                {group.activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onDelete={() => handleDelete(activity)}
                    onTogglePin={() => handleTogglePin(activity)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ActivityItem - Single activity in the timeline
 */
function ActivityItem({ activity, onDelete, onTogglePin }) {
  const [showMenu, setShowMenu] = useState(false);

  const config = ACTIVITY_TYPE_CONFIG[activity.activityType] || ACTIVITY_TYPE_CONFIG.note;
  const Icon = config.icon;

  // Format call details
  const callDetails = useMemo(() => {
    if (activity.activityType !== 'call') return null;

    const parts = [];
    if (activity.callDirection) {
      parts.push(activity.callDirection === 'inbound' ? 'Inbound' : 'Outbound');
    }
    if (activity.callOutcome) {
      parts.push(activity.callOutcome.replace(/_/g, ' '));
    }
    if (activity.callDurationSeconds) {
      const mins = Math.floor(activity.callDurationSeconds / 60);
      const secs = activity.callDurationSeconds % 60;
      parts.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    return parts.join(' • ');
  }, [activity]);

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-colors group',
        activity.isPinned && 'ring-1 ring-[var(--bb-color-accent)]'
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: activity.isPinned
          ? 'var(--bb-color-accent)'
          : 'var(--bb-color-border-subtle)',
      }}
    >
      {/* Pinned indicator */}
      {activity.isPinned && (
        <div
          className="absolute -top-2 -right-2 p-1 rounded-full"
          style={{ backgroundColor: 'var(--bb-color-accent)' }}
        >
          <Pin className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {activity.activityType === 'call' ? (
            activity.callDirection === 'inbound' ? (
              <PhoneIncoming className="w-4 h-4" />
            ) : (
              <PhoneOutgoing className="w-4 h-4" />
            )
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {config.label}
                </span>
                {callDetails && (
                  <span className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    • {callDetails}
                  </span>
                )}
                {activity.recipient && (
                  <span className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    to {activity.recipient}
                  </span>
                )}
              </div>
              {activity.subject && (
                <p
                  className="text-sm font-medium mt-0.5"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {activity.subject}
                </p>
              )}
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bb-color-bg-elevated)]"
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg border shadow-lg min-w-[120px]"
                    style={{
                      backgroundColor: 'var(--bb-color-bg-surface)',
                      borderColor: 'var(--bb-color-border-subtle)',
                    }}
                  >
                    <button
                      onClick={() => {
                        onTogglePin();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bb-color-bg-elevated)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      <Pin className="w-4 h-4" />
                      {activity.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bb-color-bg-elevated)]"
                      style={{ color: 'var(--bb-color-status-negative)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {activity.content && (
            <p
              className="text-sm mt-2 whitespace-pre-wrap"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {activity.content}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
            {activity.creator?.name && <span>{activity.creator.name}</span>}
            {activity.creator?.name && <span>•</span>}
            <span>{format(new Date(activity.createdAt), 'h:mm a')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
