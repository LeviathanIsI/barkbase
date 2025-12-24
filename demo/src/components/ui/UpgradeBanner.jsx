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
        'rounded-lg border-2 border-[var(--bb-color-alert-warning-border)] bg-[var(--bb-color-alert-warning-bg)] p-[var(--bb-space-6)] text-center',
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bb-color-status-warning-soft)]">
        <Zap className="h-6 w-6 text-[var(--bb-color-status-warning)]" />
      </div>
      <h3 className="mt-[var(--bb-space-4)] text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)]">
        Upgrade to {requiredPlan} to unlock this feature
      </h3>
      {feature && (
        <p className="mt-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
          {feature} is available on the {requiredPlan} plan and higher.
        </p>
      )}
      <div className="mt-[var(--bb-space-6)]">
        <Button variant="default" className="bg-[var(--bb-color-status-warning)] text-white hover:opacity-90">
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default UpgradeBanner;
