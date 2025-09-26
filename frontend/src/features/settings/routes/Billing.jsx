import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { can } from '@/lib/acl';

const Billing = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);
  const planFeatures = tenant?.features ?? {};

  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };

  const canManageBilling = can(permissionContext, 'manageBilling');

  const handlePortalClick = () => {
    toast('Billing portal integration coming soon.', {
      icon: '💳',
    });
  };

  return (
    <DashboardLayout
      title="Billing & Subscription"
      description="Review plan benefits and manage subscription details."
      actions={
        canManageBilling ? (
          <Button onClick={handlePortalClick}>Go to billing portal</Button>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card
          title="Current plan"
          description="Plans unlock advanced reporting, audit trails, and priority billing support."
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Badge variant="neutral" className="uppercase">
                {tenant?.plan ?? 'FREE'}
              </Badge>
              <span className="text-muted">Manage features based on your subscription tier.</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <span className="text-text">Billing portal access</span>
                <Badge variant={planFeatures.billingPortal ? 'success' : 'warning'}>
                  {planFeatures.billingPortal ? 'Included' : 'Upgrade required'}
                </Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-text">Audit log retention</span>
                <Badge variant={planFeatures.auditLog ? 'success' : 'warning'}>
                  {planFeatures.auditLog ? 'Included' : 'Upgrade required'}
                </Badge>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-text">Advanced revenue reports</span>
                <Badge variant={planFeatures.advancedReports ? 'success' : 'warning'}>
                  {planFeatures.advancedReports ? 'Included' : 'Upgrade required'}
                </Badge>
              </li>
            </ul>
            {canManageBilling ? (
              <div className="rounded-lg border border-border/70 bg-surface/60 p-4 text-sm text-muted">
                Need changes to your subscription? Use the billing portal to update payment methods or invoices.
              </div>
            ) : (
              <div className="rounded-lg border border-warning/60 bg-warning/10 p-4 text-sm text-warning">
                Upgrade to BarkBase Pro to unlock billing management and advanced controls.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePortalClick} disabled={!canManageBilling} variant={canManageBilling ? 'default' : 'outline'}>
                Go to billing portal
              </Button>
            </div>
          </div>
        </Card>
        <Card title="Plan comparison" description="What you gain when upgrading.">
          <ul className="space-y-3 text-sm">
            <li>
              <p className="font-semibold text-text">Pro</p>
              <p className="text-muted">Audit log exports, revenue analytics, and billing automation.</p>
            </li>
            <li>
              <p className="font-semibold text-text">Enterprise</p>
              <p className="text-muted">All Pro features, plus dedicated success manager and custom SLAs.</p>
            </li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
