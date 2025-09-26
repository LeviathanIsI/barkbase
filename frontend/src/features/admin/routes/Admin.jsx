import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const Admin = () => (
  <DashboardLayout
    title="Platform Admin"
    description="Centralized controls for compliance, audit logging, and global feature toggles."
    actions={<Button variant="ghost">View Audit Log</Button>}
  >
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Feature Flags" description="Toggle capabilities per tenant or subscription tier.">
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span>Offline Mode</span>
            <Button size="sm" variant="ghost">
              Enabled
            </Button>
          </li>
          <li className="flex items-center justify-between">
            <span>White-Label Emails</span>
            <Button size="sm" variant="ghost">
              Beta
            </Button>
          </li>
        </ul>
      </Card>
      <Card title="Security Posture" description="Rate limits, JWT rotation, and 2FA enforcement are managed here.">
        <p className="text-sm text-muted">
          Frontend surfaces configuration pulled from backend policy endpoints. This placeholder highlights
          the areas connected via Express routes for auth, tenants, and admin operations.
        </p>
        <Button className="mt-4" variant="ghost">
          Review Policies
        </Button>
      </Card>
    </div>
  </DashboardLayout>
);

export default Admin;
