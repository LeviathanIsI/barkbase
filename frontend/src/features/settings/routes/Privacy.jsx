import Card from '@/components/ui/Card';
import SettingsPage from '../components/SettingsPage';

const Privacy = () => {
  return (
    
    <SettingsPage title="Privacy & Data" description="Manage data retention, GDPR compliance, and privacy settings">
      <Card title="Data Retention" description="Control how long data is stored.">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Configure automatic data deletion policies and retention periods for different data types.
          </p>
          <div className="rounded-lg border border-border/60 bg-surface/60 p-4">
            <p className="text-sm text-muted">Data retention policies coming soon.</p>
          </div>
        </div>
      </Card>

      <Card title="GDPR Compliance" description="Manage customer consent and data privacy.">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Track customer consents, handle data access requests, and ensure GDPR compliance.
          </p>
          <div className="rounded-lg border border-border/60 bg-surface/60 p-4">
            <p className="text-sm text-muted">GDPR tools coming soon.</p>
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Privacy;