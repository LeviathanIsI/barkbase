import { useState } from 'react';
import {
  Mail, Smartphone, Monitor, Bell, Clock, Save,
  BellRing, AlertTriangle, Calendar, CreditCard, Heart,
  MessageSquare, Users
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';

const NotificationsOverview = () => {
  const user = useAuthStore((state) => state.user);

  // Communication channels
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    inApp: true,
    push: false,
  });

  // Notification frequency
  const [frequency, setFrequency] = useState('real-time');

  // Quiet hours
  const [quietHours, setQuietHours] = useState({
    enabled: true,
    start: '22:00',
    end: '07:00',
  });

  // Activity alerts
  const [alerts, setAlerts] = useState({
    newBooking: true,
    cancellation: true,
    modification: true,
    paymentReceived: true,
    paymentFailed: true,
    vaccinationExpiring: true,
    vaccinationExpired: true,
    newInquiry: true,
  });

  // Critical alerts - always on
  const [criticalAlerts, setCriticalAlerts] = useState({
    emergencies: true,
    systemDowntime: true,
    securityAlerts: true,
  });

  const handleSave = async () => {
    try {
      await apiClient.put('/api/v1/settings/notifications', {
        channels,
        frequency,
        quietHours,
        alerts,
        criticalAlerts,
      });
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(error.message || 'Failed to save preferences');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Configure how and when you receive notifications</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </header>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Communication Channels */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Communication Channels
            </h3>
            <div className="space-y-2">
              <ToggleRow
                icon={Mail}
                label="Email"
                description={user?.email}
                checked={channels.email}
                onChange={(v) => setChannels(p => ({ ...p, email: v }))}
              />
              <ToggleRow
                icon={Smartphone}
                label="SMS"
                description="Not configured"
                checked={channels.sms}
                onChange={(v) => setChannels(p => ({ ...p, sms: v }))}
              />
              <ToggleRow
                icon={Monitor}
                label="In-App"
                description="Browser notifications"
                checked={channels.inApp}
                onChange={(v) => setChannels(p => ({ ...p, inApp: v }))}
              />
              <ToggleRow
                icon={BellRing}
                label="Push"
                description="Mobile app required"
                checked={channels.push}
                onChange={(v) => setChannels(p => ({ ...p, push: v }))}
              />
            </div>
          </Card>

          {/* Activity Alerts */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Activity Alerts
            </h3>

            {/* Bookings */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Bookings
              </p>
              <div className="space-y-1 pl-4">
                <ToggleRow label="New bookings" checked={alerts.newBooking} onChange={(v) => setAlerts(p => ({ ...p, newBooking: v }))} compact />
                <ToggleRow label="Cancellations" checked={alerts.cancellation} onChange={(v) => setAlerts(p => ({ ...p, cancellation: v }))} compact />
                <ToggleRow label="Modifications" checked={alerts.modification} onChange={(v) => setAlerts(p => ({ ...p, modification: v }))} compact />
              </div>
            </div>

            {/* Payments */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" /> Payments
              </p>
              <div className="space-y-1 pl-4">
                <ToggleRow label="Payment received" checked={alerts.paymentReceived} onChange={(v) => setAlerts(p => ({ ...p, paymentReceived: v }))} compact />
                <ToggleRow label="Payment failed" checked={alerts.paymentFailed} onChange={(v) => setAlerts(p => ({ ...p, paymentFailed: v }))} compact />
              </div>
            </div>

            {/* Pet Health */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Heart className="w-3 h-3" /> Pet Health
              </p>
              <div className="space-y-1 pl-4">
                <ToggleRow label="Vaccination expiring" checked={alerts.vaccinationExpiring} onChange={(v) => setAlerts(p => ({ ...p, vaccinationExpiring: v }))} compact />
                <ToggleRow label="Vaccination expired" checked={alerts.vaccinationExpired} onChange={(v) => setAlerts(p => ({ ...p, vaccinationExpired: v }))} compact />
              </div>
            </div>

            {/* Customer Communication */}
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Customer
              </p>
              <div className="space-y-1 pl-4">
                <ToggleRow label="New inquiries" checked={alerts.newInquiry} onChange={(v) => setAlerts(p => ({ ...p, newInquiry: v }))} compact />
              </div>
            </div>
          </Card>

          {/* Critical Alerts */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical Alerts
            </h3>
            <p className="text-xs text-muted mb-3">These alerts cannot be disabled and are sent via all channels</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text">Emergency incidents</span>
                <span className="text-xs text-green-600 font-medium">Always On</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text">System downtime</span>
                <span className="text-xs text-green-600 font-medium">Always On</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-text">Security alerts</span>
                <span className="text-xs text-green-600 font-medium">Always On</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Schedule */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </h3>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">Frequency</label>
              <div className="flex gap-2">
                {['real-time', 'daily', 'weekly'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      frequency === freq
                        ? 'bg-primary text-white'
                        : 'bg-surface-secondary text-muted hover:bg-surface-elevated'
                    }`}
                  >
                    {freq === 'real-time' ? 'Real-time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted">Quiet Hours</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={quietHours.enabled}
                  onClick={() => setQuietHours(p => ({ ...p, enabled: !p.enabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    quietHours.enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    quietHours.enabled ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {quietHours.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">From</label>
                    <StyledSelect
                      options={[
                        { value: '20:00', label: '8:00 PM' },
                        { value: '21:00', label: '9:00 PM' },
                        { value: '22:00', label: '10:00 PM' },
                        { value: '23:00', label: '11:00 PM' },
                      ]}
                      value={quietHours.start}
                      onChange={(opt) => setQuietHours(p => ({ ...p, start: opt?.value || '22:00' }))}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">To</label>
                    <StyledSelect
                      options={[
                        { value: '06:00', label: '6:00 AM' },
                        { value: '07:00', label: '7:00 AM' },
                        { value: '08:00', label: '8:00 AM' },
                        { value: '09:00', label: '9:00 AM' },
                      ]}
                      value={quietHours.end}
                      onChange={(opt) => setQuietHours(p => ({ ...p, end: opt?.value || '07:00' }))}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Info */}
          <Card className="p-5 bg-surface-secondary">
            <h3 className="text-sm font-semibold text-text mb-2">How it works</h3>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>• Critical alerts always bypass quiet hours</li>
              <li>• Daily digest sent at 9:00 AM your time</li>
              <li>• Weekly digest sent Monday 9:00 AM</li>
              <li>• SMS requires phone number in profile</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Toggle Row Component
const ToggleRow = ({ icon: Icon, label, description, checked, onChange, compact = false }) => (
  <div className={`flex items-center justify-between ${compact ? 'py-1' : 'py-1.5'}`}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-muted" />}
      <div>
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-text`}>{label}</span>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

export default NotificationsOverview;
