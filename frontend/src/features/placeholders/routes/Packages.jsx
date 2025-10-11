import { Package, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const Packages = () => {
  return (
    <PlaceholderPage
      title="Packages & Memberships"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Records' },
        { label: 'Packages & Memberships' },
      ]}
      description="Create multi-visit packages, punch cards, and recurring membership plans. Offer discounts for loyal customers and prepaid stays."
      illustration={Package}
      primaryCTA={{
        label: 'Create Package',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="packages"
    />
  );
};

export default Packages;
