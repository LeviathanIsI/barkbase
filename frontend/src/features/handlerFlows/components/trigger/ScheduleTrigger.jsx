import { Trash2, Calendar, Clock } from 'lucide-react';

const ScheduleTrigger = ({ schedule, onUpdate, onRemove }) => {
  const handleFrequencyChange = (frequency) => {
    onUpdate({ ...schedule, frequency });
  };

  const handleDateChange = (date) => {
    onUpdate({ ...schedule, date });
  };

  const handleTimeChange = (time) => {
    onUpdate({ ...schedule, time });
  };

  const handleWeekdayChange = (weekday) => {
    onUpdate({ ...schedule, weekday });
  };

  const handleDayOfMonthChange = (dayOfMonth) => {
    onUpdate({ ...schedule, dayOfMonth });
  };

  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between bg-green-500/5 border-b border-border">
        <span className="text-sm font-semibold text-text">Group 1</span>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-600 transition-colors"
          title="Delete schedule"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-text mb-3">On a schedule</h4>

          {/* Frequency */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={schedule.frequency}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Date (for 'once' frequency) */}
          {schedule.frequency === 'once' && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-text">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="date"
                  value={schedule.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Weekday (for 'weekly' frequency) */}
          {schedule.frequency === 'weekly' && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-text">
                Day of week <span className="text-red-500">*</span>
              </label>
              <select
                value={schedule.weekday || 'monday'}
                onChange={(e) => handleWeekdayChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          {/* Day of month (for 'monthly' frequency) */}
          {schedule.frequency === 'monthly' && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-text">
                Day of month <span className="text-red-500">*</span>
              </label>
              <select
                value={schedule.dayOfMonth || '1'}
                onChange={(e) => handleDayOfMonthChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time of day */}
          <div className="space-y-2 mt-4">
            <label className="block text-sm font-medium text-text flex items-center gap-2">
              Time of day <span className="text-red-500">*</span>
              <button
                type="button"
                className="p-0.5 hover:bg-border/50 rounded-full"
                title="Schedule will run in your account's timezone"
              >
                <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted">
              {schedule.time ? `${schedule.time} EDT` : 'Select a time'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTrigger;
