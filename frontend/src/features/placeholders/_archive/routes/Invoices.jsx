import { FileText, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const Invoices = () => {
  return (
    <PlaceholderPage
      title="Invoices"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Billing' },
        { label: 'Invoices' },
      ]}
      description="Create, send, and track invoices for bookings and services. Monitor payment status, send reminders, and manage outstanding balances."
      illustration={FileText}
      primaryCTA={{
        label: 'Create Invoice',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="invoices"
    />
  );
};

export default Invoices;
