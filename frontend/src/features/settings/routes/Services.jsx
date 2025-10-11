import Card from '@/components/ui/Card';
import SettingsPage from '../components/SettingsPage';

const Services = () => {
  return (
    
    <SettingsPage title="Services" description="Manage boarding, daycare, grooming, and training services">
      <Card title="Service Catalog" description="Configure the services you offer.">
        <div className="rounded-lg border border-border/60 bg-surface/60 p-4">
          <p className="text-sm text-muted">
            Service management interface coming soon. You'll be able to create and manage your service catalog here.
          </p>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Services;