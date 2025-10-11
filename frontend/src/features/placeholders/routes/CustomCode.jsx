import { Code, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const CustomCode = () => {
  return (
    <PlaceholderPage
      title="Custom Code"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Automations' },
        { label: 'Custom Code' },
      ]}
      description="Execute custom JavaScript code in your workflows for advanced logic, data transformations, and integrations beyond standard actions."
      illustration={Code}
      primaryCTA={{
        label: 'Add Custom Code',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="custom-code"
    />
  );
};

export default CustomCode;
