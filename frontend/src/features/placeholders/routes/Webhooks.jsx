import { Webhook, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const Webhooks = () => {
  return (
    <PlaceholderPage
      title="Webhooks"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Automations' },
        { label: 'Webhooks' },
      ]}
      description="Integrate BarkBase with external systems. Send real-time data to your own applications, marketing tools, or third-party services."
      illustration={Webhook}
      primaryCTA={{
        label: 'Add Webhook',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="webhooks"
    />
  );
};

export default Webhooks;
