import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
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
            <StyledSelect
              options={[
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'America/Chicago', label: 'America/Chicago (CST)' },
                { value: 'America/Denver', label: 'America/Denver (MST)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
              ]}
              value={formData.timezone}
              onChange={(opt) => handleInputChange('timezone', opt?.value || 'America/New_York')}
              isClearable={false}
              isSearchable={true}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Language</label>
            <StyledSelect
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
              ]}
              value={formData.language}
              onChange={(opt) => handleInputChange('language', opt?.value || 'en')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Date Format</label>
            <StyledSelect
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
              value={formData.dateFormat}
              onChange={(opt) => handleInputChange('dateFormat', opt?.value || 'MM/DD/YYYY')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Currency</label>
            <StyledSelect
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
              ]}
              value={formData.currency}
              onChange={(opt) => handleInputChange('currency', opt?.value || 'USD')}
              isClearable={false}
              isSearchable={false}
            />
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
