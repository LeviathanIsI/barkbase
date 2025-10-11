import Card from '@/components/ui/Card';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import { useTenantStore } from '@/stores/tenant';
import SettingsPage from '../components/SettingsPage';

const Email = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan || 'FREE';

  const limits = {
    FREE: { templates: 3, daily: 200 },
    PRO: { templates: 25, daily: 2000 },
    ENTERPRISE: { templates: 'Unlimited', daily: 10000 },
  };

  return (
    
    <SettingsPage title="Email Settings" description="Configure email templates, automation, and branding">
      <Card
        title="Email Templates"
        description={`Create up to ${limits[plan].templates} email templates for confirmations, reminders, and updates.`}
      >
        <p className="text-sm text-muted">
          Templates available: Booking Confirmation, Check-in Reminder, Vaccination Reminder
        </p>
      </Card>

      {plan === 'FREE' ? (
        <UpgradeBanner requiredPlan="PRO" feature="Automated Emails" />
      ) : (
        <Card title="Automated Emails" description="Automatically send emails based on booking events.">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked />
              <span>Send booking confirmation emails</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked />
              <span>Send check-in reminder (24h before)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" />
              <span>Send vaccination expiration reminders</span>
            </label>
          </div>
        </Card>
      )}

      {plan === 'FREE' ? (
        <UpgradeBanner requiredPlan="PRO" feature="Email Branding" />
      ) : (
        <Card title="Email Branding" description="Customize your email appearance with your logo and colors.">
          <p className="text-sm text-muted">Upload logo and set brand colors for all outgoing emails.</p>
        </Card>
      )}

      <Card
        title="Email Sending Limits"
        description={`You can send up to ${limits[plan].daily} emails per day.`}
      >
        <p className="text-sm text-muted">Current usage: 45 / {limits[plan].daily} today</p>
      </Card>

      {plan === 'FREE' && (
        <UpgradeBanner requiredPlan="PRO" feature="Email Tracking (Opens & Clicks)" />
      )}
    </SettingsPage>
  );
};

export default Email;