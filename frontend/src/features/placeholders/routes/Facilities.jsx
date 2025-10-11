import { Building2, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const Facilities = () => {
  return (
    <PlaceholderPage
      title="Facilities & Runs"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Records' },
        { label: 'Facilities & Runs' },
      ]}
      description="Manage your facility layout, kennel runs, suites, and play areas. Define capacity, amenities, and pricing by accommodation type."
      illustration={Building2}
      primaryCTA={{
        label: 'Add Run',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="facilities"
    />
  );
};

export default Facilities;
