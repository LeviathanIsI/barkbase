import { Pill, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const FeedingMeds = () => {
  return (
    <PlaceholderPage
      title="Feeding & Medications"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Operations' },
        { label: 'Feeding & Meds' },
      ]}
      description="Track feeding schedules, dietary restrictions, and medication administration for all pets in your care."
      illustration={Pill}
      primaryCTA={{
        label: 'Log Feeding',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="feeding-meds"
    />
  );
};

export default FeedingMeds;
