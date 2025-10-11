import { Mail, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const FollowUps = () => {
  return (
    <PlaceholderPage
      title="Follow-ups (Sequences)"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Automations' },
        { label: 'Follow-ups' },
      ]}
      description="Automated email and SMS sequences for follow-ups, re-engagement, and nurture campaigns. Stay in touch with pet parents effortlessly."
      illustration={Mail}
      primaryCTA={{
        label: 'Create Sequence',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="follow-ups"
    />
  );
};

export default FollowUps;
