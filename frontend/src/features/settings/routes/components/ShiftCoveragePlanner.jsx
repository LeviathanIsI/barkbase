import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Users, AlertTriangle, CheckCircle, Plus, Zap } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const ShiftCoveragePlanner = ({ onClose }) => {
  const tz = useTimezoneUtils();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  // Mock coverage data
  const coverageData = {
    '2024-01-15': { // Monday
      '9-12': { required: 2, actual: 3, status: 'good' },
      '12-3': { required: 2, actual: 2, status: 'adequate' },
      '3-6': { required: 2, actual: 1, status: 'low' },
    },
    '2024-01-16': { // Tuesday
      '9-12': { required: 2, actual: 3, status: 'good' },
      '12-3': { required: 2, actual: 2, status: 'adequate' },
      '3-6': { required: 2, actual: 1, status: 'low' },
    },
    '2024-01-17': { // Wednesday
      '9-12': { required: 2, actual: 2, status: 'adequate' },
      '12-3': { required: 2, actual: 2, status: 'adequate' },
      '3-6': { required: 2, actual: 0, status: 'critical' },
    },
    '2024-01-18': { // Thursday
      '9-12': { required: 2, actual: 3, status: 'good' },
      '12-3': { required: 2, actual: 2, status: 'adequate' },
      '3-6': { required: 2, actual: 2, status: 'adequate' },
    },
    '2024-01-19': { // Friday
      '9-12': { required: 2, actual: 3, status: 'good' },
      '12-3': { required: 2, actual: 2, status: 'adequate' },
      '3-6': { required: 2, actual: 2, status: 'adequate' },
    },
    '2024-01-20': { // Saturday
      '9-12': { required: 2, actual: 1, status: 'low' },
      '12-3': { required: 2, actual: 1, status: 'low' },
      '3-6': { required: 2, actual: 2, status: 'adequate' },
    },
    '2024-01-21': { // Sunday
      '9-12': { required: 1, actual: 1, status: 'adequate' },
      '12-3': { required: 1, actual: 1, status: 'adequate' },
      '3-6': { required: 1, actual: 1, status: 'adequate' },
    }
  };

  const getWeekDates = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Start on Monday

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      dates.push(day);
    }
    return dates;
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200';
      case 'adequate': return 'bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200';
      case 'low': return 'bg-yellow-100 dark:bg-surface-secondary text-yellow-800 dark:text-yellow-200';
      case 'critical': return 'bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
      case 'adequate':
        return CheckCircle;
      case 'low':
      case 'critical':
        return AlertTriangle;
      default:
        return Users;
    }
  };

  const weekDates = getWeekDates(currentWeek);
  const timeSlots = ['9-12', '12-3', '3-6'];

  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newDate);
  };

  const getWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${tz.formatShortDate(start)} - ${tz.formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getCoverageStats = () => {
    let totalSlots = 0;
    let adequateSlots = 0;
    let lowSlots = 0;
    let criticalSlots = 0;

    weekDates.forEach(date => {
      const dateKey = formatDateKey(date);
      const dayData = coverageData[dateKey];

      if (dayData) {
        timeSlots.forEach(slot => {
          totalSlots++;
          const slotData = dayData[slot];
          if (slotData) {
            if (slotData.status === 'adequate' || slotData.status === 'good') {
              adequateSlots++;
            } else if (slotData.status === 'low') {
              lowSlots++;
            } else if (slotData.status === 'critical') {
              criticalSlots++;
            }
          }
        });
      }
    });

    return { totalSlots, adequateSlots, lowSlots, criticalSlots };
  };

  const stats = getCoverageStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Shift Coverage Planner</h2>
            <p className="text-gray-600 dark:text-text-secondary">Monitor and manage staffing coverage</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-medium">{getWeekRange()}</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Auto-fill Gaps
            </Button>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Request Coverage
            </Button>
          </div>
        </div>

        {/* Coverage Statistics */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.totalSlots}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Total Slots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.adequateSlots}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Adequate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.lowSlots}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Low Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.criticalSlots}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Critical</div>
            </div>
          </div>
        </div>

        {/* Coverage Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-surface-border">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-text-primary w-20">Time</th>
                  {weekDates.map((date, index) => {
                    const dayName = tz.formatDate(date, { weekday: 'short' });
                    const dayNumber = date.getDate();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <th key={index} className={`text-center py-3 px-4 font-medium ${isToday ? 'bg-blue-50 dark:bg-surface-primary' : ''}`}>
                        <div className="text-sm text-gray-600 dark:text-text-secondary">{dayName}</div>
                        <div className={`text-lg ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-text-primary'}`}>
                          {dayNumber}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot} className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-text-primary">
                      {timeSlot}
                    </td>
                    {weekDates.map((date, index) => {
                      const dateKey = formatDateKey(date);
                      const slotData = coverageData[dateKey]?.[timeSlot] || { required: 2, actual: 0, status: 'critical' };
                      const StatusIcon = getStatusIcon(slotData.status);

                      return (
                        <td key={index} className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTimeSlot({ date: dateKey, time: timeSlot, data: slotData })}
                            className={`w-full py-2 px-3 rounded-lg border transition-colors ${getStatusColor(slotData.status)} hover:opacity-80`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <StatusIcon className="w-4 h-4" />
                              <span className="font-medium">{slotData.actual}/{slotData.required}</span>
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="p-6 border-t border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-surface-secondary rounded"></div>
              <span>Adequate coverage (≥ required)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 dark:bg-surface-secondary rounded"></div>
              <span>Good coverage (&gt; required)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 dark:bg-surface-secondary rounded"></div>
              <span>Low coverage (&lt; required)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-surface-secondary rounded"></div>
              <span>Critical (significantly understaffed)</span>
            </div>
          </div>
        </div>

        {/* Time Slot Details Modal */}
        {selectedTimeSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Coverage Details - {selectedTimeSlot.time}
                </h3>
                <p className="text-gray-600 dark:text-text-secondary mb-4">
                  {tz.formatDate(selectedTimeSlot.date, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Required staff:</span>
                    <span className="font-medium">{selectedTimeSlot.data.required}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currently scheduled:</span>
                    <span className="font-medium">{selectedTimeSlot.data.actual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge className={getStatusColor(selectedTimeSlot.data.status)}>
                      {selectedTimeSlot.data.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button className="flex-1">
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTimeSlot(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftCoveragePlanner;
