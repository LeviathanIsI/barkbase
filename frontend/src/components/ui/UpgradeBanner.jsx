import { Zap } from 'lucide-react';
import Button from './Button';
import { useTenantStore } from '@/stores/tenant';
import { cn } from '@/lib/cn';

const UpgradeBanner = ({ requiredPlan = 'PRO', feature, className }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const currentPlan = tenant?.plan || 'FREE';

  const planOrder = { FREE: 0, PRO: 1, ENTERPRISE: 2 };
  const shouldShow = planOrder[currentPlan] < planOrder[requiredPlan];

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-warning/50 bg-warning/10 p-6 text-center',
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
        <Zap className="h-6 w-6 text-warning" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-text">
        Upgrade to {requiredPlan} to unlock this feature
      </h3>
      {feature && (
        <p className="mt-2 text-sm text-muted">
          {feature} is available on the {requiredPlan} plan and higher.
        </p>
      )}
      <div className="mt-6">
        <Button variant="default" className="bg-warning text-white hover:bg-warning/90">
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default UpgradeBanner;
