import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { isFeatureEnabled } from '@/lib/features';
import ThemePreview from '../components/ThemePreview';

const TenantSettings = () => {
  const canInvite = useAuthStore((state) => state.hasRole(['OWNER']));
  const tenant = useTenantStore((state) => state.tenant);
  const domainManagementEnabled = isFeatureEnabled('billing.portal', tenant.plan, tenant.featureFlags);

  return (
    <DashboardLayout
      title="Tenant Administration"
      description="Manage white-label themes, domains, and feature toggles per tenant."
      actions={
        <Button disabled={!canInvite}>Invite Admin</Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <ThemePreview />
        <div className="space-y-4 rounded-2xl border border-border/70 bg-surface p-6">
          <h3 className="text-lg font-semibold text-text">Domain & SSL</h3>
          <p className="text-sm text-muted">
            Configure custom domains and automatically provision SSL certificates via the edge proxy.
            This placeholder integrates with backend provisioning APIs.
          </p>
          <Button variant="ghost" className="mt-4 self-start" disabled={!domainManagementEnabled}>
            Configure Custom Domain
          </Button>
          {!domainManagementEnabled ? (
            <p className="text-xs text-muted">Upgrade to Enterprise to enable domain automation.</p>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TenantSettings;
