import { Moon, Calendar, Settings } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const DoNotDisturb = ({ dnd, onUpdate }) => {
  const handleStatusChange = (status) => {
    onUpdate({
      ...dnd,
      enabled: status === 'on'
    });
  };

  const handleScheduleChange = (field, value) => {
    onUpdate({
      ...dnd,
      schedule: {
        ...dnd.schedule,
        [field]: value
      }
    });
  };

  const handleForwardingChange = (forwarding) => {
    onUpdate({
      ...dnd,
      forwarding
    });
  };

  const handleCriticalAlertsChange = (enabled) => {
    onUpdate({
      ...dnd,
      stillSendCritical: enabled
    });
  };

  return (
    <Card title="Do Not Disturb" icon={Moon}>
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-text-secondary">
          Temporarily pause non-critical notifications
        </p>

        {/* Status */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-text-primary">Status:</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dndStatus"
                value="off"
                checked={!dnd.enabled}
                onChange={() => handleStatusChange('off')}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm">Off</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dndStatus"
                value="on"
                checked={dnd.enabled}
                onChange={() => handleStatusChange('on')}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="text-sm">On</span>
            </label>
          </div>
        </div>

        {/* Schedule */}
        {dnd.enabled && (
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  From
                </label>
                <input
                  type="datetime-local"
                  value={dnd.schedule?.start || ''}
                  onChange={(e) => handleScheduleChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  To
                </label>
                <input
                  type="datetime-local"
                  value={dnd.schedule?.end || ''}
                  onChange={(e) => handleScheduleChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Forwarding Option */}
            <div className="mb-4">
              <span className="text-sm text-gray-600 dark:text-text-secondary">During DND mode:</span>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dndForwarding"
                    value="hold"
                    checked={dnd.forwarding === 'hold'}
                    onChange={() => handleForwardingChange('hold')}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-sm">Hold all notifications (send digest when resuming)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dndForwarding"
                    value="forward"
                    checked={dnd.forwarding === 'forward'}
                    onChange={() => handleForwardingChange('forward')}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm">Forward to team member:</span>
                    <div className="min-w-[200px]">
                      <StyledSelect
                        options={[
                          { value: '', label: 'Select team member' },
                          { value: 'sarah', label: 'Sarah Johnson (Manager)' },
                          { value: 'mike', label: 'Mike Chen (Staff)' },
                          { value: 'lisa', label: 'Lisa Rodriguez (Groomer)' },
                        ]}
                        isClearable={false}
                        isSearchable={false}
                      />
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Critical Alerts */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={dnd.stillSendCritical}
                onChange={(e) => handleCriticalAlertsChange(e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm">Still send critical alerts (payments, emergencies)</span>
            </label>
          </div>
        )}

        {/* Quick Enable Button */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-surface-border">
          <div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              {dnd.enabled ? 'DND is currently active' : 'Quickly enable Do Not Disturb'}
            </p>
          </div>
          <Button
            variant={dnd.enabled ? "outline" : "default"}
            onClick={() => handleStatusChange(dnd.enabled ? 'off' : 'on')}
          >
            {dnd.enabled ? 'Disable DND' : 'Enable Do Not Disturb'}
          </Button>
        </div>

        {/* Vacation Mode Info */}
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Extended Time Off</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                For vacations or extended absences, schedule DND for specific date ranges.
                All non-critical notifications will be held until you return.
              </p>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:bg-surface-primary">
                <Settings className="w-4 h-4 mr-1" />
                Schedule Extended DND
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DoNotDisturb;
