import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import SettingsPage from '../components/SettingsPage';

const General = () => {
  return (
    
    <SettingsPage title="General Settings" description="Configure your kennel's basic information and regional settings">
      <Card title="Kennel Name & Branding" description="Business name and logo displayed to customers.">
        <div className="space-y-4">
          <Input label="Business Name" defaultValue="BarkBase Demo Kennel" />
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
            <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option>America/New_York (EST)</option>
              <option>America/Chicago (CST)</option>
              <option>America/Denver (MST)</option>
              <option>America/Los_Angeles (PST)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Language</label>
            <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Date Format</label>
            <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Currency</label>
            <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Business Hours" description="Your operating hours for bookings and scheduling.">
        <div className="space-y-3 text-sm">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24 font-medium text-text">{day}</div>
              <input type="time" defaultValue="09:00" className="rounded border border-border bg-surface px-2 py-1" />
              <span className="text-muted">to</span>
              <input type="time" defaultValue="18:00" className="rounded border border-border bg-surface px-2 py-1" />
              <label className="flex items-center gap-2">
                <input type="checkbox" />
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
        <Button>Save Changes</Button>
      </div>
    </SettingsPage>
  );
};

export default General;