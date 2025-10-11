import UpgradeBanner from '@/components/ui/UpgradeBanner';
import Card from '@/components/ui/Card';
import { useTenantStore } from '@/stores/tenant';
import SettingsPage from '../components/SettingsPage';

const SMS = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan || 'FREE';

  if (plan === 'FREE') {
    return (
      <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
        <UpgradeBanner requiredPlan="PRO" feature="SMS Notifications" className="xl:col-span-2" />
      </SettingsPage>
    );
  }

  return (
    <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
      <Card title="SMS Notifications" description="Send automated text reminders (pay-per-use pricing).">
        <div className="space-y-3 text-sm">
          <p className="text-muted">Cost: $0.01 per SMS sent</p>
          <label className="flex items-center gap-3">
            <input type="checkbox" />
            <span>Enable SMS notifications</span>
          </label>
        </div>
      </Card>

      <Card title="SMS Templates" description="Create templates for quick text messages.">
        <p className="text-sm text-muted">
          Templates available: {plan === 'PRO' ? 'Up to 10' : 'Unlimited'}
        </p>
      </Card>

      {plan !== 'ENTERPRISE' ? (
        <UpgradeBanner requiredPlan="ENTERPRISE" feature="Two-way SMS" className="xl:col-span-2" />
      ) : (
        <Card title="Two-way SMS" description="Allow owners to reply to SMS notifications in real time.">
          <p className="text-sm text-muted">Configure reply routing to on-duty staff or group inboxes.</p>
        </Card>
      )}
    </SettingsPage>
  );
};

export default SMS;
