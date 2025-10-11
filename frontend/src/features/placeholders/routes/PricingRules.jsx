import { DollarSign, Plus } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const PricingRules = () => {
  return (
    <PlaceholderPage
      title="Pricing Rules"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Billing' },
        { label: 'Pricing Rules' },
      ]}
      description="Set up dynamic pricing: seasonal rates, multi-pet discounts, loyalty pricing, early bird specials, and custom pricing tiers."
      illustration={DollarSign}
      primaryCTA={{
        label: 'Add Pricing Rule',
        icon: Plus,
        disabled: true,
        onClick: () => {},
      }}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="pricing-rules"
    />
  );
};

export default PricingRules;
