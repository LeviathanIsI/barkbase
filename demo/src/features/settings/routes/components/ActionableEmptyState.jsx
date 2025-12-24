/**
 * ActionableEmptyState - Minimal empty state for services
 */

import { Plus, Package } from 'lucide-react';
import Button from '@/components/ui/Button';

const ActionableEmptyState = ({
  category,
  onCreateService,
}) => {
  const getCategoryInfo = (cat) => {
    switch (cat) {
      case 'boarding':
        return {
          emptyMessage: 'No boarding services yet',
          buttonLabel: 'Create Boarding Service',
        };
      case 'daycare':
        return {
          emptyMessage: 'No daycare services yet',
          buttonLabel: 'Create Daycare Service',
        };
      case 'grooming':
        return {
          emptyMessage: 'No grooming services yet',
          buttonLabel: 'Create Grooming Service',
        };
      case 'training':
        return {
          emptyMessage: 'No training services yet',
          buttonLabel: 'Create Training Service',
        };
      case 'add-ons':
        return {
          emptyMessage: 'No add-on services yet',
          buttonLabel: 'Create Add-on',
        };
      case 'memberships':
        return {
          emptyMessage: 'No membership plans yet',
          buttonLabel: 'Create Membership',
        };
      default:
        return {
          emptyMessage: 'No services yet',
          buttonLabel: 'Create Service',
        };
    }
  };

  const categoryInfo = getCategoryInfo(category);

  return (
    <div className="py-16 text-center">
      <Package className="w-10 h-10 mx-auto mb-4 text-[var(--bb-color-text-muted)]" />
      <p className="text-[var(--bb-color-text-muted)] mb-6">
        {categoryInfo.emptyMessage}
      </p>
      <Button onClick={onCreateService}>
        <Plus className="w-4 h-4 mr-2" />
        {categoryInfo.buttonLabel}
      </Button>
    </div>
  );
};

export default ActionableEmptyState;
