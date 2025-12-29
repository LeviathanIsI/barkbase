import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useState, useMemo } from 'react';
import { useTimezoneUtils } from '@/lib/timezone';
import { useRunsQuery } from '@/features/daycare/api';

const ScheduleCalendarView = () => {
  const tz = useTimezoneUtils();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: runsData, isLoading } = useRunsQuery({ date: selectedDate });
  const runs = useMemo(() => Array.isArray(runsData) ? runsData : (runsData?.data || []), [runsData]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };
  const handleToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Team Schedule</h2>
          <p className="text-gray-600 dark:text-text-secondary">View daycare runs and staff assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">{tz.formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
      </div>

      {/* Runs for selected day */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Runs</h3>
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            {isLoading ? 'Loading…' : `${runs.length} run${runs.length === 1 ? '' : 's'}`}
          </div>
        </div>
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-text-secondary">Fetching runs…</div>
        ) : runs.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-text-secondary">No runs scheduled for this day.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {runs.map((run) => {
              const assignedPets = Array.isArray(run.assignedPets) ? run.assignedPets : [];
              return (
                <div key={run.recordId || run.id} className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900 dark:text-text-primary">{run.name || 'Run'}</div>
                    <div className="text-xs text-gray-600 dark:text-text-secondary">Capacity: {run.capacity ?? 0}</div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary mb-2">Assigned pets: {assignedPets.length}</div>
                  {assignedPets.length > 0 && (
                    <ul className="text-sm text-gray-700 dark:text-text-primary list-disc pl-5">
                      {assignedPets.slice(0, 6).map((p, idx) => (
                        <li key={idx}>{p?.name || p?.petName || 'Pet'}</li>
                      ))}
                      {assignedPets.length > 6 && (
                        <li className="text-gray-500 dark:text-text-secondary">+{assignedPets.length - 6} more…</li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Calendar preview */}
      <Card className="p-6">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-1">Calendar</h3>
          <p className="text-gray-600 dark:text-text-secondary">A full visual calendar will appear here.</p>
        </div>
      </Card>
    </div>
  );
};

export default ScheduleCalendarView;
