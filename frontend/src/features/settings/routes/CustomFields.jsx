import Card from '@/components/ui/Card';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import { useTenantStore } from '@/stores/tenant';
import SettingsPage from '../components/SettingsPage';

const CustomFields = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan || 'FREE';
  
  const limits = {
    FREE: { owner: 20, pet: 20 },
    PRO: { owner: 100, pet: 100 },
    ENTERPRISE: { owner: 'Unlimited', pet: 'Unlimited' },
  };

  return (
    
    <SettingsPage title="Custom Fields (Properties)" description="Add custom fields to collect additional information about pet owners and pets">
      <Card
        title="Owner Custom Fields"
        description={`Create up to ${limits[plan].owner} custom fields for pet owner records.`}
      >
        <p className="text-sm text-muted">
          Examples: Emergency Contact, Veterinarian, Preferred Communication Method
        </p>
      </Card>

      <Card
        title="Pet Custom Fields"
        description={`Create up to ${limits[plan].pet} custom fields for pet records.`}
      >
        <p className="text-sm text-muted">
          Examples: Microchip Number, Special Dietary Needs, Behavioral Notes
        </p>
      </Card>

      {plan === 'FREE' && (
        <UpgradeBanner requiredPlan="PRO" feature="Required Fields" />
      )}

      {plan === 'FREE' && (
        <UpgradeBanner requiredPlan="PRO" feature="Conditional Fields" />
      )}

      {plan === 'FREE' && (
        <UpgradeBanner requiredPlan="PRO" feature="Calculated Fields" />
      )}
    </SettingsPage>
  );
};

export default CustomFields;