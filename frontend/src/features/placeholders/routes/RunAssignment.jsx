import { Home, Play } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const RunAssignment = () => {
  return (
    <PlaceholderPage
      title="Run Assignment"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Operations' },
        { label: 'Run Assignment' },
      ]}
      description="Assign pets to runs and manage kennel capacity in real-time. View availability, move pets between runs, and track occupancy."
      illustration={Home}
      primaryCTA={{
        label: 'Assign Run',
        icon: Play,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="runs"
    />
  );
};

export default RunAssignment;
