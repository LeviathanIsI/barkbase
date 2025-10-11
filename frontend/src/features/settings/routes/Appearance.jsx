import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '../api-user';
import { cn } from '@/lib/cn';
import SettingsPage from '../components/SettingsPage';

const Appearance = () => {
  const { data: profile, isLoading } = useUserProfileQuery();
  const updateProfile = useUpdateUserProfileMutation();

  const defaultPreferences = {
    theme: 'system',
    sidebarCollapsed: false,
  };

  const [preferences, setPreferences] = useState(defaultPreferences);

  useEffect(() => {
    if (profile?.preferences?.appearance) {
      setPreferences({ ...defaultPreferences, ...profile.preferences.appearance });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        preferences: {
          ...profile?.preferences,
          appearance: preferences,
        },
      });
      toast.success('Appearance preferences updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update preferences');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme for daytime use',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme for low-light environments',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Match your system preferences',
    },
  ];

  return (
    
    <SettingsPage title="Appearance Settings" description="Customize how BarkBase looks for you">
      <Card title="Theme" description="Choose your preferred color theme.">
        <div className="grid gap-4 md:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = preferences.theme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreferences((prev) => ({ ...prev, theme: option.value }))}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-lg border-2 p-4 text-center transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 hover:border-border'
                )}
              >
                <Icon className={cn('h-8 w-8', isSelected ? 'text-primary' : 'text-muted')} />
                <div>
                  <p className="font-medium text-text">{option.label}</p>
                  <p className="mt-1 text-xs text-muted">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Layout" description="Adjust the app layout to your preference.">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-text">Collapse Sidebar by Default</p>
            <p className="text-sm text-muted">Start with a collapsed sidebar for more space</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPreferences((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.sidebarCollapsed ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.sidebarCollapsed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      <div className="xl:col-span-2 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (profile?.preferences?.appearance) {
              setPreferences({ ...defaultPreferences, ...profile.preferences.appearance });
            } else {
              setPreferences(defaultPreferences);
            }
          }}
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </SettingsPage>
  );
};

export default Appearance;