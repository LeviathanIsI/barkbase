import { User, Eye, FileText } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const CustomerNotifications = ({ notifications, onUpdate }) => {
  const handleConfirmationChange = (value) => {
    onUpdate({
      ...notifications,
      confirmations: value
    });
  };

  const handleReminderToggle = (reminderKey, enabled) => {
    onUpdate({
      ...notifications,
      reminders: {
        ...notifications.reminders,
        [reminderKey]: enabled
      }
    });
  };

  const handleHoursChange = (hours) => {
    onUpdate({
      ...notifications,
      reminders: {
        ...notifications.reminders,
        hoursBefore: hours
      }
    });
  };

  const handleReportCardToggle = (enabled) => {
    onUpdate({
      ...notifications,
      reportCards: {
        ...notifications.reportCards,
        enabled
      }
    });
  };

  const handlePhotoUpdatesToggle = (enabled) => {
    onUpdate({
      ...notifications,
      reportCards: {
        ...notifications.reportCards,
        photoUpdates: enabled
      }
    });
  };

  const handleTimingChange = (timing) => {
    onUpdate({
      ...notifications,
      reportCards: {
        ...notifications.reportCards,
        timing
      }
    });
  };

  const handleMarketingToggle = (marketingKey, enabled) => {
    onUpdate({
      ...notifications,
      marketing: {
        ...notifications.marketing,
        [marketingKey]: enabled
      }
    });
  };

  const handleViewTemplate = () => {
    // TODO: Open template preview
  };

  const handlePreviewExperience = () => {
    // TODO: Open customer experience preview
  };

  return (
    <Card title="Customer Notifications" icon={User}>
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-text-secondary">
          Control what your customers receive
        </p>

        {/* Booking Confirmations */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">BOOKING CONFIRMATIONS</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="confirmations"
                value="immediate"
                checked={notifications.confirmations === 'immediate'}
                onChange={() => handleConfirmationChange('immediate')}
                className="text-blue-600 dark:text-blue-400"
              />
              <div>
                <span className="font-medium">Send immediately after booking</span>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Customers get instant confirmation</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="confirmations"
                value="batch"
                checked={notifications.confirmations === 'batch'}
                onChange={() => handleConfirmationChange('batch')}
                className="text-blue-600 dark:text-blue-400"
              />
              <div>
                <span className="font-medium">Send within 1 hour (batch multiple services)</span>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Combine services into one confirmation</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="confirmations"
                value="manual"
                checked={notifications.confirmations === 'manual'}
                onChange={() => handleConfirmationChange('manual')}
                className="text-blue-600 dark:text-blue-400"
              />
              <div>
                <span className="font-medium">Don't send (manual only)</span>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Staff sends confirmations manually</p>
              </div>
            </label>
          </div>

          <div className="mt-3">
            <Button variant="outline" onClick={handleViewTemplate}>
              <FileText className="w-4 h-4 mr-2" />
              View/Edit Template
            </Button>
          </div>
        </div>

        {/* Reminders */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">REMINDERS</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.reminders.sevenDays}
                onChange={(e) => handleReminderToggle('sevenDays', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>7 days before check-in</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.reminders.twentyFourHours}
                onChange={(e) => handleReminderToggle('twentyFourHours', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>24 hours before check-in</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.reminders.dayOf}
                onChange={(e) => handleReminderToggle('dayOf', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Day-of check-in (</span>
              <div className="min-w-[100px]">
                <StyledSelect
                  options={[
                    { value: 1, label: '1 hour' },
                    { value: 2, label: '2 hours' },
                    { value: 3, label: '3 hours' },
                    { value: 4, label: '4 hours' },
                  ]}
                  value={notifications.reminders.hoursBefore}
                  onChange={(opt) => handleHoursChange(opt?.value || 1)}
                  isClearable={false}
                  isSearchable={false}
                  isDisabled={!notifications.reminders.dayOf}
                />
              </div>
              <span>before)</span>
            </div>
          </div>
        </div>

        {/* Report Cards & Updates */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">REPORT CARDS & UPDATES</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.reportCards.enabled}
                onChange={(e) => handleReportCardToggle(e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Send report card after each visit</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.reportCards.photoUpdates}
                onChange={(e) => handlePhotoUpdatesToggle(e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
                disabled={!notifications.reportCards.enabled}
              />
              <span>Send photo updates during stay</span>
            </label>
            <div className="ml-6">
              <span className="text-sm text-gray-600 dark:text-text-secondary">Timing: </span>
              <label className="inline-flex items-center gap-2 ml-2">
                <input
                  type="radio"
                  name="timing"
                  value="real-time"
                  checked={notifications.reportCards.timing === 'real-time'}
                  onChange={() => handleTimingChange('real-time')}
                  disabled={!notifications.reportCards.photoUpdates}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span className="text-sm">Real-time</span>
              </label>
              <label className="inline-flex items-center gap-2 ml-4">
                <input
                  type="radio"
                  name="timing"
                  value="end-of-day"
                  checked={notifications.reportCards.timing === 'end-of-day'}
                  onChange={() => handleTimingChange('end-of-day')}
                  disabled={!notifications.reportCards.photoUpdates}
                  className="text-blue-600 dark:text-blue-400"
                />
                <span className="text-sm">End of day (6:00 PM)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Marketing Communications */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">MARKETING COMMUNICATIONS</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.marketing.birthdays}
                onChange={(e) => handleMarketingToggle('birthdays', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Birthday wishes</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.marketing.rebooking}
                onChange={(e) => handleMarketingToggle('rebooking', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Re-booking reminders (inactive 30+ days)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.marketing.seasonal}
                onChange={(e) => handleMarketingToggle('seasonal', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Seasonal promotions</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifications.marketing.newsletter}
                onChange={(e) => handleMarketingToggle('newsletter', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span>Newsletter and updates</span>
            </label>
          </div>
        </div>

        {/* Preview Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={handlePreviewExperience}>
            <Eye className="w-4 h-4 mr-2" />
            Preview Customer Experience
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CustomerNotifications;
