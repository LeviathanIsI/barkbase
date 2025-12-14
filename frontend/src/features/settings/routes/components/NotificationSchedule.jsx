import { Clock, Settings } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const NotificationSchedule = ({ schedule, onUpdate }) => {
  const handleFrequencyChange = (frequency) => {
    onUpdate({ ...schedule, frequency });
  };

  const handleQuietHoursToggle = () => {
    onUpdate({
      ...schedule,
      quietHours: {
        ...schedule.quietHours,
        enabled: !schedule.quietHours.enabled
      }
    });
  };

  const handleQuietHoursChange = (field, value) => {
    onUpdate({
      ...schedule,
      quietHours: {
        ...schedule.quietHours,
        [field]: value
      }
    });
  };

  const handleEmailsOnlyToggle = () => {
    onUpdate({
      ...schedule,
      quietHours: {
        ...schedule.quietHours,
        emailsOnly: !schedule.quietHours.emailsOnly
      }
    });
  };

  const handleConfigureDND = () => {
    // TODO: Open DND configuration modal
  };

  return (
    <Card title="Notification Schedule" icon={Clock}>
      <div className="space-y-6">
        {/* Frequency Settings */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Frequency</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="frequency"
                value="real-time"
                checked={schedule.frequency === 'real-time'}
                onChange={() => handleFrequencyChange('real-time')}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm">Real-time (as events happen)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="frequency"
                value="daily"
                checked={schedule.frequency === 'daily'}
                onChange={() => handleFrequencyChange('daily')}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm">Daily summary (9:00 AM)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={schedule.frequency === 'weekly'}
                onChange={() => handleFrequencyChange('weekly')}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm">Weekly summary (Monday 9:00 AM)</span>
            </label>
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-text-primary">Quiet Hours</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={schedule.quietHours.enabled}
                onChange={handleQuietHoursToggle}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm">Enable</span>
            </label>
          </div>

          {schedule.quietHours.enabled && (
            <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-text-secondary">
                Don't send notifications during these times
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    From
                  </label>
                  <StyledSelect
                    options={[
                      { value: '20:00', label: '8:00 PM' },
                      { value: '21:00', label: '9:00 PM' },
                      { value: '22:00', label: '10:00 PM' },
                      { value: '23:00', label: '11:00 PM' },
                    ]}
                    value={schedule.quietHours.start}
                    onChange={(opt) => handleQuietHoursChange('start', opt?.value || '20:00')}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    To
                  </label>
                  <StyledSelect
                    options={[
                      { value: '06:00', label: '6:00 AM' },
                      { value: '07:00', label: '7:00 AM' },
                      { value: '08:00', label: '8:00 AM' },
                      { value: '09:00', label: '9:00 AM' },
                    ]}
                    value={schedule.quietHours.end}
                    onChange={(opt) => handleQuietHoursChange('end', opt?.value || '06:00')}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={schedule.quietHours.emailsOnly}
                  onChange={handleEmailsOnlyToggle}
                  className="rounded border-gray-300 dark:border-surface-border"
                />
                <span className="text-sm">Emails only (allow urgent SMS/in-app)</span>
              </label>
            </div>
          )}
        </div>

        {/* Do Not Disturb */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-text-primary">Do Not Disturb</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Temporarily pause non-critical notifications</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${schedule.doNotDisturb.enabled ? 'text-red-600' : 'text-gray-500 dark:text-text-secondary'}`}>
                {schedule.doNotDisturb.enabled ? 'ON' : 'OFF'}
              </span>
              <Button variant="outline" size="sm" onClick={handleConfigureDND}>
                <Settings className="w-4 h-4 mr-1" />
                Configure
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NotificationSchedule;
