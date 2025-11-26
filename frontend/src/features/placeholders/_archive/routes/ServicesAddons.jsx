import { Sparkles, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const ServicesAddons = () => {
  return (
    <PlaceholderPage
      title="Services & Add-ons"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Records' },
        { label: 'Services & Add-ons' },
      ]}
      description="Define your service catalog: grooming, training, playtime, spa treatments, and other add-on services with pricing and duration."
      illustration={Sparkles}
      primaryCTA={{
        label: 'Add Service',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="services"
    />
  );
};

export default ServicesAddons;
