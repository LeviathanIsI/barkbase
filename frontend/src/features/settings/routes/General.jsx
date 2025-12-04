import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const General = () => {
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    businessHours: DAYS_OF_WEEK.map(day => ({
      day,
      open: '09:00',
      close: '18:00',
      closed: day === 'Sunday',
    })),
  });

  // Fetch account defaults
  const { data: settings, isLoading } = useQuery({
    queryKey: ['account-defaults'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/account-defaults');
      return res.data?.data || res.data;
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        businessName: settings.businessName || settings.name || '',
        timezone: settings.timezone || 'America/New_York',
        language: settings.language || 'en',
        dateFormat: settings.dateFormat || 'MM/DD/YYYY',
        currency: settings.currency || 'USD',
        businessHours: settings.businessHours || prev.businessHours,
      }));
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.put('/api/v1/account-defaults', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-defaults'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (dayIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      businessHours: prev.businessHours.map((hours, i) =>
        i === dayIndex ? { ...hours, [field]: value } : hours
      ),
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <SettingsPage title="General Settings" description="Configure your kennel's basic information and regional settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage title="General Settings" description="Configure your kennel's basic information and regional settings">
      <Card title="Kennel Name & Branding" description="Business name and logo displayed to customers.">
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={formData.businessName}
            onChange={(e) => handleInputChange('businessName', e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Logo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface/50">
              </div>
              <Button variant="outline" size="sm">Upload Logo</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Regional Settings" description="Time zone, language, and formatting preferences.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Time Zone</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
            >
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Language</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Date Format</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={formData.dateFormat}
              onChange={(e) => handleInputChange('dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Currency</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Business Hours" description="Your operating hours for bookings and scheduling.">
        <div className="space-y-3 text-sm">
          {formData.businessHours.map((hours, index) => (
            <div key={hours.day} className="flex items-center gap-4">
              <div className="w-24 font-medium text-text">{hours.day}</div>
              <input
                type="time"
                value={hours.open}
                onChange={(e) => handleHoursChange(index, 'open', e.target.value)}
                disabled={hours.closed}
                className="rounded border border-border bg-surface px-2 py-1 disabled:opacity-50"
              />
              <span className="text-muted">to</span>
              <input
                type="time"
                value={hours.close}
                onChange={(e) => handleHoursChange(index, 'close', e.target.value)}
                disabled={hours.closed}
                className="rounded border border-border bg-surface px-2 py-1 disabled:opacity-50"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hours.closed}
                  onChange={(e) => handleHoursChange(index, 'closed', e.target.checked)}
                />
                <span className="text-muted">Closed</span>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Holiday Schedule" description="Manage closed dates and holidays.">
        <Button variant="outline">Manage Holiday Schedule</Button>
      </Card>

      <div className="xl:col-span-2 flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </SettingsPage>
  );
};

export default General;
