/**
 * Time Clock System - Staff time tracking
 * Allows staff to clock in/out and track hours
 */
import { useState, useEffect, useCallback } from 'react';
import { Clock, Play, Pause, Square, Coffee, Calendar, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTimeStatus,
  getTimeEntries,
  approveTimeEntry,
} from '../api-timeclock';

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

const TimeClockSystem = () => {
  const tz = useTimezoneUtils();

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return tz.formatTime(dateString);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return tz.formatDate(dateString, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const [status, setStatus] = useState({
    isClockedIn: false,
    isOnBreak: false,
    clockIn: null,
    elapsedMinutes: 0,
    breakMinutes: 0,
    workedMinutes: 0,
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch current status and recent entries
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, entriesRes] = await Promise.all([
        getTimeStatus(),
        getTimeEntries({ limit: 10 }),
      ]);

      setStatus(statusRes);
      setEntries(entriesRes.data || entriesRes.entries || []);
    } catch (err) {
      console.error('Failed to fetch time clock data:', err);
      setError(err.message || 'Failed to load time clock data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update elapsed time every minute when clocked in
  useEffect(() => {
    if (!status.isClockedIn || !status.clockIn) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      const clockInTime = new Date(status.clockIn);
      const elapsed = Math.floor((now - clockInTime) / 60000);
      setElapsedTime(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [status.isClockedIn, status.clockIn]);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      await clockIn();
      await fetchData();
    } catch (err) {
      console.error('Clock in failed:', err);
      alert(err.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!confirm('Are you sure you want to clock out?')) return;
    
    try {
      setActionLoading(true);
      await clockOut();
      await fetchData();
    } catch (err) {
      console.error('Clock out failed:', err);
      alert(err.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      setActionLoading(true);
      await startBreak();
      await fetchData();
    } catch (err) {
      console.error('Start break failed:', err);
      alert(err.message || 'Failed to start break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setActionLoading(true);
      await endBreak();
      await fetchData();
    } catch (err) {
      console.error('End break failed:', err);
      alert(err.message || 'Failed to end break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (entryId) => {
    try {
      await approveTimeEntry(entryId);
      await fetchData();
    } catch (err) {
      console.error('Approve failed:', err);
      alert(err.message || 'Failed to approve entry');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--bb-color-accent)' }} />
      </div>
    );
  }

  const workedMinutes = elapsedTime - (status.breakMinutes || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Time Clock
          </h2>
          <p style={{ color: 'var(--bb-color-text-secondary)' }}>
            Track staff hours and attendance
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      {/* Clock Status Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-3 rounded-full',
                status.isClockedIn
                  ? status.isOnBreak
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                  : 'bg-gray-100'
              )}
            >
              <Clock
                className={cn(
                  'h-6 w-6',
                  status.isClockedIn
                    ? status.isOnBreak
                      ? 'text-yellow-600'
                      : 'text-green-600'
                    : 'text-gray-400'
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                {status.isClockedIn
                  ? status.isOnBreak
                    ? 'On Break'
                    : 'Clocked In'
                  : 'Clocked Out'}
              </h3>
              {status.isClockedIn && (
                <p className="text-sm" style={{ color: 'var(--bb-color-text-secondary)' }}>
                  Since {formatTime(status.clockIn)}
                </p>
              )}
            </div>
          </div>

          {/* Time Display */}
          {status.isClockedIn && (
            <div className="text-right">
              <div className="text-3xl font-bold font-mono" style={{ color: 'var(--bb-color-text-primary)' }}>
                {formatDuration(workedMinutes)}
              </div>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                worked today
              </p>
              {status.breakMinutes > 0 && (
                <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                  + {formatDuration(status.breakMinutes)} break
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!status.isClockedIn ? (
            <Button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="flex-1 sm:flex-none"
            >
              <Play className="h-4 w-4 mr-2" />
              Clock In
            </Button>
          ) : (
            <>
              {!status.isOnBreak ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleStartBreak}
                    disabled={actionLoading}
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Start Break
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClockOut}
                    disabled={actionLoading}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Clock Out
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleEndBreak}
                  disabled={actionLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  End Break
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Recent Time Entries */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Recent Time Entries
          </h3>
          <Calendar className="h-5 w-5" style={{ color: 'var(--bb-color-text-muted)' }} />
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--bb-color-text-muted)' }}>
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No time entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {entry.staffName || 'Staff'}
                      </span>
                      {entry.approvedAt ? (
                        <CheckCircle className="h-4 w-4 text-green-500" title="Approved" />
                      ) : entry.status === 'COMPLETED' ? (
                        <button
                          onClick={() => handleApprove(entry.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Approve
                        </button>
                      ) : null}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--bb-color-text-secondary)' }}>
                      {formatDate(entry.clockIn)} • {formatTime(entry.clockIn)} - {entry.clockOut ? formatTime(entry.clockOut) : 'Active'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {entry.totalHours ? `${entry.totalHours}h` : '-'}
                  </div>
                  {entry.breakMinutes > 0 && (
                    <div className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                      {formatDuration(entry.breakMinutes)} break
                    </div>
                  )}
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      entry.status === 'ACTIVE' && 'bg-green-100 text-green-700',
                      entry.status === 'COMPLETED' && 'bg-gray-100 text-gray-700',
                      entry.status === 'EDITED' && 'bg-yellow-100 text-yellow-700',
                      entry.status === 'FLAGGED' && 'bg-red-100 text-red-700'
                    )}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TimeClockSystem;
