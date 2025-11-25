import Card from '@/components/ui/Card';
import ThemePreview from '@/features/tenants/components/ThemePreview';
import SettingsPage from '../components/SettingsPage';

const Branding = () => {
  return (
    
    <SettingsPage title="Theme & Branding" description="Customize your workspace colors and branding">
<ThemePreview />

      <Card
        title="Custom Domain"
        description="Configure a custom domain for your workspace (Enterprise plan required)."
      >
        <div className="rounded-lg border border-[var(--bb-color-alert-warning-border)] bg-[var(--bb-color-alert-warning-bg)] p-[var(--bb-space-4)]">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-alert-warning-text)]">
            Custom domain configuration is available on the Enterprise plan.
            Contact sales to learn more.
          </p>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Branding;