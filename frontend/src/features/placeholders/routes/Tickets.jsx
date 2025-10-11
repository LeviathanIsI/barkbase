import { TicketIcon, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const Tickets = () => {
  return (
    <PlaceholderPage
      title="Tickets (Issues)"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Support' },
        { label: 'Tickets' },
      ]}
      description="Track support requests, incidents, and issues. Assign tickets to staff, set priorities, and maintain a history of resolutions."
      illustration={TicketIcon}
      primaryCTA={{
        label: 'Create Ticket',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="tickets"
    />
  );
};

export default Tickets;
