import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SettingsPage from '../components/SettingsPage';

const Business = () => {
  return (
    
    <SettingsPage title="Business Profile" description="Manage your business information and operating hours">
      <Card title="Business Information" description="Update your business details.">
        <form className="space-y-4">
          <Input label="Business Name" defaultValue="BarkBase Demo" disabled />
          <Input label="Phone" placeholder="+1 (555) 123-4567" />
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Address</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3}
              placeholder="Street address, city, state, ZIP"
            />
          </div>
          <div className="xl:col-span-2 flex justify-end">
            <Button type="button" disabled>
              Save Changes (Coming Soon)
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Business Hours" description="Set your operating hours for each day of the week.">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Business hours configuration coming soon. This will help customers know when you're available.
          </p>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Business;