import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StyledSelect from '@/components/ui/StyledSelect';
import { useAvailableSlotsQuery } from '../api-templates';

/**
 * TimeSlotPicker - Modal dialog for selecting pet run time slots
 * Suggests next available slot but allows manual override
 */
const TimeSlotPicker = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  runId, 
  runName,
  template,
  selectedDate,
  petName 
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [isLoading, setIsLoading] = useState(false);

  const { data: availableSlots = [], isLoading: slotsLoading } = useAvailableSlotsQuery(runId, selectedDate);

  // Calculate next available slot
  useEffect(() => {
    if (isOpen && availableSlots.length > 0 && template) {
      const nextAvailable = availableSlots.find(slot => slot.available);
      if (nextAvailable) {
        setStartTime(nextAvailable.startTime);
        setEndTime(nextAvailable.endTime);
      }
    }
  }, [isOpen, availableSlots, template]);

  // Auto-calculate end time based on start time and time period
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    if (template?.timePeriodMinutes) {
      const [hours, minutes] = newStartTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + template.timePeriodMinutes;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      setEndTime(`${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ startTime, endTime });
      onClose();
    } catch (error) {
      console.error('Failed to confirm time slot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 7; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        options.push({ value: time, label: time });
      }
    }
    return options;
  }, []);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Schedule ${petName} for ${runName}`}
      size="md"
    >
      <div className="space-y-4">
        {template && (
          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-medium mb-1">
              <Clock className="h-4 w-4" />
              Time Period: {template.timePeriodMinutes} minutes
            </div>
            <div className="text-blue-700 dark:text-blue-300">
              Capacity: {template.maxCapacity} pets ({template.capacityType === 'concurrent' ? 'per time slot' : 'total'})
            </div>
          </div>
        )}

        {slotsLoading ? (
          <div className="text-center py-4 text-gray-500 dark:text-text-secondary">Loading available slots...</div>
        ) : (
          <>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                Start Time
              </label>
              <StyledSelect
                options={timeOptions}
                value={startTime}
                onChange={(opt) => handleStartTimeChange(opt?.value || '09:00')}
                isClearable={false}
                isSearchable={true}
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                End Time
              </label>
              <StyledSelect
                options={timeOptions.filter(opt => opt.value > startTime)}
                value={endTime}
                onChange={(opt) => setEndTime(opt?.value || '09:30')}
                isClearable={false}
                isSearchable={true}
              />
            </div>

            {availableSlots.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-text-secondary">
                {availableSlots.find(s => s.startTime === startTime && s.endTime === endTime)?.available === false && (
                  <div className="text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ This time slot may be at capacity
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading || slotsLoading}
            loading={isLoading}
          >
            Confirm Time
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TimeSlotPicker;

